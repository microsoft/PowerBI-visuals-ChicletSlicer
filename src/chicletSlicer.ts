/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

import lodashSortby from "lodash.sortby";
import lodashSome from "lodash.some";

import "../style/chicletSlicer.less";

import powerbiVisualsApi from "powerbi-visuals-api";
import powerbi = powerbiVisualsApi;

// d3
import { Selection as d3Selection } from "d3-selection";
type Selection<T1, T2 = T1> = d3Selection<any, T1, any, T2>;

import { select as d3Select } from "d3-selection";

// powerbi
import DataView = powerbi.DataView;
import IViewport = powerbi.IViewport;
import DataViewCategoryColumn = powerbiVisualsApi.DataViewCategoryColumn;
import DataViewPropertyValue = powerbiVisualsApi.DataViewPropertyValue;

import IVisual = powerbi.extensibility.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IColorPalette = powerbiVisualsApi.extensibility.IColorPalette;
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;
import VisualUpdateOptions = powerbiVisualsApi.extensibility.visual.VisualUpdateOptions;
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;

// powerbi.extensibility.utils.type
import { pixelConverter as PixelConverter } from "powerbi-visuals-utils-typeutils";

// powerbi.extensibility.utils.interactivity
import { interactivityBaseService as interactivityService, interactivitySelectionService } from "powerbi-visuals-utils-interactivityutils";
import IInteractivityService = interactivityService.IInteractivityService;
import createInteractivitySelectionService = interactivitySelectionService.createInteractivitySelectionService;

// powerbi.extensibility.utils.svg
import * as SVGUtil from "powerbi-visuals-utils-svgutils";
import ClassAndSelector = SVGUtil.CssConstants.ClassAndSelector;
import createClassAndSelector = SVGUtil.CssConstants.createClassAndSelector;

// powerbi.extensibility.utils.color
import { hexToRGBString, ColorHelper } from "powerbi-visuals-utils-colorutils";

// powerbi.extensibility.utils.formatting
import { textMeasurementService, valueFormatter, interfaces} from "powerbi-visuals-utils-formattingutils";
import TextProperties = interfaces.TextProperties;

import { ChicletSlicerData, ChicletSlicerDataPoint } from "./interfaces";
import { ChicletSlicerSettingsModel } from "./chicletSlicerSettingsModel";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { ChicletSlicerBehaviorOptions, ChicletSlicerWebBehavior } from "./webBehavior";
import { ChicletSlicerConverter } from "./chicletSlicerConverter";
import { ITableView, TableViewFactory, TableViewViewOptions } from "./tableView";
import { BaseDataPoint, InteractivityServiceOptions } from "powerbi-visuals-utils-interactivityutils/lib/interactivityBaseService";

import { createTooltipServiceWrapper, ITooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";
import VisualTooltipDataItem = powerbiVisualsApi.extensibility.VisualTooltipDataItem;

import IFilter = powerbi.IFilter;
import ISelectionManager = powerbiVisualsApi.extensibility.ISelectionManager;

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace ChicletBorderStyle {
    export const ROUNDED: string = 'Rounded';
    export const CUT: string = 'Cut';
    export const SQUARE: string = 'Square';
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace ChicletSlicerShowDisabled {
    export const INPLACE: string = 'Inplace';
    export const BOTTOM: string = 'Bottom';
    export const HIDE: string = 'Hide';
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Orientation {
    export const HORIZONTAL: string = 'Horizontal';
    export const VERTICAL: string = 'Vertical';
}

export class ChicletSlicer implements IVisual {
    private root: Selection<any>;
    private searchHeader: Selection<any>;
    private searchInput: Selection<any>;
    private currentViewport: IViewport;
    private dataView: DataView;
    private slicerHeader: Selection<any>;
    private slicerBody: Selection<any>;
    private tableView: ITableView;

    private interactivityService: IInteractivityService<BaseDataPoint> | any;
    private visualHost: IVisualHost;

    private colorPalette: IColorPalette;
    private colorHelper: ColorHelper;

    private jsonFilters: IFilter[] | undefined | any;
    private tooltipService: ITooltipServiceWrapper;
    private selectionManager: ISelectionManager;

    private localizationManager: ILocalizationManager;

    private ExternalImageTelemetryTraced: boolean = false;

    private resetScrollbarPosition: boolean;

    /**
     * It's public for testability.
     */
    public behavior: ChicletSlicerWebBehavior;

    /**
     * It's public for testability.
     */
    public formattingSettings: ChicletSlicerSettingsModel;
    private formattingSettingsService: FormattingSettingsService;

    public static DefaultOpacity: number = 1;
    public static DisabledOpacity: number = 0.2;
    public static HoveredTextOpacity: number = 0.6;
    public static DimmedOpacity: number = 0.5;

    public static DefaultFontFamily: string = "helvetica, arial, sans-serif";
    public static DefaultFontSizeInPt: number = 11;

    private static СellTotalInnerPaddings: number = 8;
    private static СellTotalInnerBorders: number = 2;
    private static СhicletTotalInnerRightLeftPaddings: number = 14;

    public static MinImageSplit: number = 0;
    public static MinImageSplitToHide: number = 10;
    public static MaxImageSplit: number = 100;
    public static MaxImageSplitToHide: number = 90;
    public static MaxImageWidth: number = 100;
    public static MaxTransparency: number = 100;

    private static MinSizeOfViewport: number = 0;
    private static MinColumns: number = 1;
    private static WidthOfScrollbar: number = 17;

    public static ItemContainerSelector: ClassAndSelector = createClassAndSelector('slicerItemContainer');
    public static SlicerImgWrapperSelector: ClassAndSelector = createClassAndSelector('slicer-img-wrapper');
    public static SlicerTextWrapperSelector: ClassAndSelector = createClassAndSelector('slicer-text-wrapper');
    public static SlicerBodyHorizontalSelector: ClassAndSelector = createClassAndSelector('slicerBody-horizontal');
    public static SlicerBodyVerticalSelector: ClassAndSelector = createClassAndSelector('slicerBody-vertical');
    public static HeaderTextSelector: ClassAndSelector = createClassAndSelector('headerText');
    public static ContainerSelector: ClassAndSelector = createClassAndSelector('chicletSlicer');
    public static LabelTextSelector: ClassAndSelector = createClassAndSelector('slicerText');
    public static HeaderSelector: ClassAndSelector = createClassAndSelector('slicerHeader');
    public static InputSelector: ClassAndSelector = createClassAndSelector('slicerCheckbox');
    public static ClearSelector: ClassAndSelector = createClassAndSelector('clear');
    public static BodySelector: ClassAndSelector = createClassAndSelector('slicerBody');

    /**
     * Public to testability.
     */
    public static getValidImageSplit(imageSplit): number {
        if (imageSplit < ChicletSlicer.MinImageSplit) {
            return ChicletSlicer.MinImageSplit;
        } else if (imageSplit > ChicletSlicer.MaxImageSplit) {
            return ChicletSlicer.MaxImageSplit;
        } else {
            return imageSplit;
        }
    }

    public converter(
        dataView: DataView,
        searchText: string,
        visualHost: IVisualHost): ChicletSlicerData {

        const categories: DataViewCategoryColumn = dataView?.categorical?.categories?.length && dataView.categorical.categories[0];

        if (!categories?.source?.roles ||
            !categories.source.roles["Category"] ||
            !categories?.values?.length) {
                return;
        }

        const converter: ChicletSlicerConverter = new ChicletSlicerConverter(dataView, visualHost);
        converter.convert();

        const selfFilterEnabled: DataViewPropertyValue = dataView?.metadata?.objects?.general?.selfFilterEnabled;

        let slicerDataPoints: ChicletSlicerDataPoint[] = converter.dataPoints;
        if (selfFilterEnabled && searchText) {
            slicerDataPoints = ChicletSlicer.FILTER_DATA_POINTS_BY_TEXT(converter.dataPoints, searchText);
        }

        const defaultSettings: ChicletSlicerSettingsModel = this.formattingSettings;
        const slicerData : ChicletSlicerData = {
            categorySourceName: categories.source.displayName,
            formatString: valueFormatter.getFormatStringByColumn(categories.source),
            slicerSettings: defaultSettings,
            slicerDataPoints: slicerDataPoints,
            identityFields: converter.identityFields,
            hasHighlights: converter.hasHighlights, 
            hasSelectionOverride: converter.hasSelectionOverride, // Override hasSelection if a objects contained more scopeIds than selections we found in the data
        };



        return slicerData;
    }

    public static FILTER_DATA_POINTS_BY_TEXT(dataPoints: ChicletSlicerDataPoint[], searchText: string): ChicletSlicerDataPoint[] {
        // const myDataPoints = Array.from(dataPoints);
        searchText = searchText.toLowerCase();
        return dataPoints.map((dp:ChicletSlicerDataPoint)=> {
            return {
                ...dp,
                filtered: !dp.category.toLowerCase().includes(searchText)
            }
        })
        // myDataPoints.forEach(x => x.filtered = x.category.toLowerCase().indexOf(searchText) < 0);
    }


    constructor(options: VisualConstructorOptions) {

        this.root = d3Select(options.element);

        this.visualHost = options.host;

        this.colorPalette = this.visualHost.colorPalette;
        this.colorHelper = new ColorHelper(this.colorPalette);

        this.localizationManager = options.host.createLocalizationManager();
        this.formattingSettingsService = new FormattingSettingsService(this.localizationManager);

        this.behavior = new ChicletSlicerWebBehavior();
        this.interactivityService = createInteractivitySelectionService(options.host);

        this.tooltipService = createTooltipServiceWrapper(
            this.visualHost.tooltipService,
            options.element
        );

        this.selectionManager = options.host.createSelectionManager();
        this.renderContextMenu();
    }

    public update(options: VisualUpdateOptions) {
        if (!options ||
            !options.dataViews ||
            !options.dataViews[0] ||
            !options.viewport) {
            return;
        }

        this.dataView = options.dataViews[0];

        this.resetScrollbarPosition = false;

        this.jsonFilters = options.jsonFilters;

        if (this.jsonFilters && this.jsonFilters[0] && this.jsonFilters[0]?.target.length === 0) {
            this.interactivityService.selectionManager.clear();
            this.resetScrollbarPosition = true;
        }

        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(ChicletSlicerSettingsModel, options.dataViews);

        const slicerData: ChicletSlicerData = this.converter(
            this.dataView,
            this.searchInput?.node().value,
            this.visualHost);

        if (!this.currentViewport) {
            this.currentViewport = options.viewport;
            this.initContainer(slicerData);
        }

        if (!(options.viewport.height === this.currentViewport.height && options.viewport.width === this.currentViewport.width)) {
            this.currentViewport = options.viewport;
        }

        this.updateInternal(slicerData);
    }

    private renderContextMenu() {
        this.root.on('contextmenu', (event) => {
            const dataPoint: any = d3Select(event.target).datum();
            this.selectionManager.showContextMenu((dataPoint && dataPoint.identity) ? dataPoint.identity : {}, {x: event.clientX, y: event.clientY});
            event.preventDefault();
        });
    }

    private changeColorsForHighContrast(settings: ChicletSlicerSettingsModel): void {
        settings.headerCardSettings.fontColor.value.value = this.colorHelper.getHighContrastColor("foreground", settings.headerCardSettings.fontColor.value.value);
        settings.headerCardSettings.outlineColor.value.value = this.colorHelper.getHighContrastColor("foreground", settings.headerCardSettings.outlineColor.value.value);
        settings.headerCardSettings.background.value.value = this.colorHelper.getThemeColor();
        settings.slicerTextCardSettings.background.value.value = this.colorHelper.getThemeColor();

        settings.slicerTextCardSettings.fontColor.value.value = this.colorHelper.getHighContrastColor("foreground", settings.slicerTextCardSettings.fontColor.value.value);
        settings.slicerTextCardSettings.outlineColor.value.value = this.colorHelper.getHighContrastColor("foreground", settings.slicerTextCardSettings.outlineColor.value.value);
        settings.slicerTextCardSettings.hoverColor.value.value = this.colorHelper.getHighContrastColor("foreground", settings.slicerTextCardSettings.hoverColor.value.value);

        settings.slicerTextCardSettings.disabledColor.value.value = this.colorHelper.getThemeColor();
        settings.slicerTextCardSettings.selectedColor.value.value = this.colorHelper.getThemeColor();
        settings.slicerTextCardSettings.unselectedColor.value.value = this.colorHelper.getThemeColor();
    }

    private updateInternal(data: ChicletSlicerData) {

        if (!data) {
            this.tableView.empty();
            return;
        }

        this.catchExternalImage(data.slicerDataPoints);

        if (this.colorHelper.isHighContrast) {
            this.changeColorsForHighContrast(data.slicerSettings);
        }

        this.updateSearchHeader();

        const slicerViewport: IViewport = this.getSlicerBodyViewport(this.currentViewport);
        this.updateSlicerBodyDimensions(slicerViewport);

        const selectedDataPoints: ChicletSlicerDataPoint[] = ChicletSlicer.getSelectedDataPoints(data); 
        data.slicerDataPoints = selectedDataPoints;

        data.slicerSettings = ChicletSlicer.getUpdatedSlicerSettings(data.slicerSettings, selectedDataPoints);
        data.slicerSettings.headerCardSettings.title.value = data.slicerSettings.headerCardSettings.title.value.trim() || data.categorySourceName;
        this.formattingSettings = data.slicerSettings;

        this.render(selectedDataPoints);
    }

    private static getSelectedDataPoints(data: ChicletSlicerData): ChicletSlicerDataPoint[] {
        const formattingSettings: ChicletSlicerSettingsModel = data.slicerSettings;

        if (formattingSettings.generalCardSettings.showDisabled.value.value === ChicletSlicerShowDisabled.BOTTOM) {
            data.slicerDataPoints = lodashSortby(data.slicerDataPoints, [x => !x.selectable]);
        } else if (formattingSettings.generalCardSettings.showDisabled.value.value === ChicletSlicerShowDisabled.HIDE) {
            data.slicerDataPoints = data.slicerDataPoints.filter(x => x.selectable);
        }

        return data.slicerDataPoints;
    }

    private static getUpdatedSlicerSettings(formattingSettings: ChicletSlicerSettingsModel, slicerDataPoints: ChicletSlicerDataPoint[]): ChicletSlicerSettingsModel {
        const rows: number = formattingSettings.generalCardSettings.rows.value,
            columns: number = formattingSettings.generalCardSettings.columns.value;

        formattingSettings.generalCardSettings.columns.value = columns <= 0
            ? +(formattingSettings.generalCardSettings.orientation.value.value === Orientation.VERTICAL && rows <= 0) : columns;

        formattingSettings.generalCardSettings.rows.value = rows <= 0
            ? +(formattingSettings.generalCardSettings.orientation.value.value === Orientation.HORIZONTAL && columns <= 0) : rows;

        if (formattingSettings.slicerTextCardSettings.height.value <= ChicletSlicer.MinImageSplit) {
            const extraSpaceForCell = ChicletSlicer.СellTotalInnerPaddings + ChicletSlicer.СellTotalInnerBorders,
                textProperties: TextProperties = ChicletSlicer.getChicletTextProperties(formattingSettings.slicerTextCardSettings.textSize.value);

            formattingSettings.slicerTextCardSettings.height.value = textMeasurementService.estimateSvgTextHeight(textProperties) +
                textMeasurementService.estimateSvgTextBaselineDelta(textProperties) +
                extraSpaceForCell;

            const hasImage: boolean = lodashSome(slicerDataPoints, (dataPoint: ChicletSlicerDataPoint) => {
                return dataPoint.imageURL !== '' && typeof dataPoint.imageURL !== undefined;
            });

            if (hasImage) {
                formattingSettings.slicerTextCardSettings.height.value += ChicletSlicer.MaxImageSplit;
            }
        }

        return formattingSettings;
    }

    public render(slicerDataPoints?: ChicletSlicerDataPoint[]): void {
        this.tableView
            .rowHeight(this.formattingSettings.slicerTextCardSettings.height.value)
            .columnWidth(this.formattingSettings.slicerTextCardSettings.width.value)
            .orientation(this.formattingSettings.generalCardSettings.orientation.value.value.toString())
            .rows(this.formattingSettings.generalCardSettings.rows.value)
            .columns(this.formattingSettings.generalCardSettings.columns.value)
            .data(
                slicerDataPoints.filter(x => !x.filtered),
                (d: ChicletSlicerDataPoint) => slicerDataPoints.indexOf(d),
                this.resetScrollbarPosition)
            .viewport(this.getSlicerBodyViewport(this.currentViewport))
            .render();
    }

    private renderTooltip(selection: Selection<any>): void {
        if (!this.tooltipService) {
            return;
        }

        this.tooltipService.addTooltip(
            selection,
            (data: ChicletSlicerDataPoint) => this.getTooltipData(data),
            (data: ChicletSlicerDataPoint) => data.identity
        );
    }

    private getTooltipData(value: any): VisualTooltipDataItem[] {
        if (this.formattingSettings.tooltipsCardSettings.show.value) {
            return [{
                displayName: value.columnName,
                value: value.category,
            }];
        }

        return null;
    }


    private initContainer(slicerData: ChicletSlicerData) {
        const settings: ChicletSlicerSettingsModel = this.formattingSettings,
            slicerBodyViewport: IViewport = this.getSlicerBodyViewport(this.currentViewport);

        const slicerContainer: Selection<any> = this.root
            .append('div')
            .classed(ChicletSlicer.ContainerSelector.className, true);

        this.slicerHeader = slicerContainer
            .append('div')
            .classed(ChicletSlicer.HeaderSelector.className, true);

        this.slicerHeader
            .append('span')
            .classed(ChicletSlicer.ClearSelector.className, true)
            .attr('title', 'Clear');

        this.slicerHeader
            .append('div')
            .classed(ChicletSlicer.HeaderTextSelector.className, true)
            .style("margin-left", PixelConverter.toString(settings.headerText.marginLeft))
            .style("margin-top", PixelConverter.toString(settings.headerText.marginTop))
            .style("border-style", this.getBorderStyle(settings.headerCardSettings.outline.value.value.toString()))
            .style("border-color", settings.headerCardSettings.outlineColor.value.value)
            .style("border-width", this.getBorderWidth(settings.headerCardSettings.outline.value.value.toString(), settings.headerCardSettings.outlineWeight.value))
            .style("font-size", PixelConverter.fromPoint(settings.headerCardSettings.textSize.value));

        this.createSearchHeader(slicerContainer);

        this.handleSearchHeaderEvents(slicerData.slicerDataPoints);

        this.slicerBody = slicerContainer
            .append('div')
            .classed(ChicletSlicer.BodySelector.className, true)
            .classed(
                ChicletSlicer.SlicerBodyHorizontalSelector.className,
                settings.generalCardSettings.orientation.value.value === Orientation.HORIZONTAL)
            .classed(
                ChicletSlicer.SlicerBodyVerticalSelector.className,
                settings.generalCardSettings.orientation.value.value === Orientation.VERTICAL
            )
            .style("height", PixelConverter.toString(slicerBodyViewport.height))
            .style("width", `${ChicletSlicer.MaxImageWidth}%`);

        const rowEnter = (rowSelection: Selection<any>) => {
            this.enterSelection(rowSelection);
        };

        const rowUpdate = (rowSelection: Selection<any>) => {
            this.selection(rowSelection, slicerData);
        };

        const rowExit = (rowSelection: Selection<any>) => {
            rowSelection.remove();
        };

        const tableViewOptions: TableViewViewOptions = {
            rowHeight: this.getRowHeight(),
            columnWidth: this.formattingSettings.slicerTextCardSettings.width.value,
            orientation: this.formattingSettings.generalCardSettings.orientation.value.value.toString(),
            rows: this.formattingSettings.generalCardSettings.rows.value,
            columns: this.formattingSettings.generalCardSettings.columns.value,
            enter: rowEnter,
            exit: rowExit,
            update: rowUpdate,
            scrollEnabled: true,
            viewport: this.getSlicerBodyViewport(this.currentViewport),
            baseContainer: this.slicerBody,
        };

        this.tableView = TableViewFactory.createTableView(tableViewOptions);
    }

    private enterSelection(rowSelection: Selection<any>): void {
        const settings: ChicletSlicerSettingsModel = this.formattingSettings;

        const ulItemElement: Selection<any> = rowSelection
            .selectAll('ul')
            .data((dataPoint: ChicletSlicerDataPoint) => {
                return [dataPoint];
            });

        const ulItemElementMerged = ulItemElement
            .enter()
            .append('ul')
            .merge(ulItemElement);

        ulItemElement
            .exit()
            .remove();

        const listItemElement: Selection<any> = ulItemElementMerged
            .selectAll(ChicletSlicer.ItemContainerSelector.selectorName)
            .data((dataPoint: ChicletSlicerDataPoint) => {
                return [dataPoint];
            });

        const listItemElementMerged = listItemElement
            .enter()
            .append('li')
            .merge(listItemElement);

        listItemElementMerged.classed(ChicletSlicer.ItemContainerSelector.className, true);

        listItemElementMerged.style("margin-left", PixelConverter.toString(settings.slicerItemContainer.marginLeft));

        const slicerImgWrapperSelection: Selection<any> = listItemElementMerged
            .selectAll(ChicletSlicer.SlicerImgWrapperSelector.selectorName)
            .data((dataPoint: ChicletSlicerDataPoint) => {
                return [dataPoint];
            });

        const slicerImgWrapperSelectionMerged = slicerImgWrapperSelection
            .enter()
            .append('img')
            .merge(slicerImgWrapperSelection);

        slicerImgWrapperSelectionMerged.classed(ChicletSlicer.SlicerImgWrapperSelector.className, true);

        slicerImgWrapperSelection
            .exit()
            .remove();

        const slicerTextWrapperSelection: Selection<any> = listItemElementMerged
            .selectAll(ChicletSlicer.SlicerTextWrapperSelector.selectorName)
            .data((dataPoint: ChicletSlicerDataPoint) => {
                return [dataPoint];
            });

        const slicerTextWrapperSelectionMerged = slicerTextWrapperSelection
            .enter()
            .append('div')
            .merge(slicerTextWrapperSelection);

        slicerTextWrapperSelectionMerged.classed(ChicletSlicer.SlicerTextWrapperSelector.className, true);

        const labelTextSelection: Selection<any> = slicerTextWrapperSelectionMerged
            .selectAll(ChicletSlicer.LabelTextSelector.selectorName)
            .data((dataPoint: ChicletSlicerDataPoint) => {
                return [dataPoint];
            });

        const labelTextSelectionMerged = labelTextSelection
            .enter()
            .append('span')
            .merge(labelTextSelection);

        labelTextSelectionMerged.classed(ChicletSlicer.LabelTextSelector.className, true);

        labelTextSelectionMerged
            .style("font-size", PixelConverter.fromPoint(settings.slicerTextCardSettings.textSize.value))
            .style("color", settings.slicerTextCardSettings.fontColor.value.value)
            .style("opacity", ChicletSlicer.DefaultOpacity);

        labelTextSelection
            .exit()
            .remove();

        slicerTextWrapperSelection
            .exit()
            .remove();

        listItemElement
            .exit()
            .remove();
    }

    private selection(rowSelection: Selection<any>, data: ChicletSlicerData): void {
        const settings: ChicletSlicerSettingsModel = this.formattingSettings;

        if (data && settings) {
            this.slicerHeader.classed('hidden', !settings.headerCardSettings.show.value);

            this.slicerHeader
                .select(ChicletSlicer.HeaderTextSelector.selectorName).text(settings.headerCardSettings.title.value.trim())
                .style("border-style", this.getBorderStyle(settings.headerCardSettings.outline.value.value.toString())).style("border-color", settings.headerCardSettings.outlineColor.value.value)
                .style("border-width", this.getBorderWidth(settings.headerCardSettings.outline.value.value.toString(), settings.headerCardSettings.outlineWeight.value))
                .style("color", settings.headerCardSettings.fontColor.value.value).style("background-color", settings.headerCardSettings.background.value.value)
                .style("font-size", PixelConverter.fromPoint(settings.headerCardSettings.textSize.value));

            this.slicerBody.classed(ChicletSlicer.SlicerBodyHorizontalSelector.className, settings.generalCardSettings.orientation.value.value === Orientation.HORIZONTAL)
                            .classed(ChicletSlicer.SlicerBodyVerticalSelector.className, settings.generalCardSettings.orientation.value.value === Orientation.VERTICAL);

            const slicerText: Selection<any> = rowSelection.selectAll(ChicletSlicer.LabelTextSelector.selectorName),
                textProperties: TextProperties = ChicletSlicer.getChicletTextProperties(settings.slicerTextCardSettings.textSize.value),
                formatString: string = data.formatString;

            const slicerBodyViewport: IViewport = this.getSlicerBodyViewport(this.currentViewport);

            slicerText.text((d: ChicletSlicerDataPoint) => {
                textProperties.text = valueFormatter.format(d.category, formatString);
                if (this.formattingSettings.slicerTextCardSettings.width.value === 0) {
                    this.formattingSettings.slicerTextCardSettings.width.value = Math.round(slicerBodyViewport.width / (this.tableView.computedColumns || ChicletSlicer.MinColumns));
                }
                const maxWidth: number = this.formattingSettings.slicerTextCardSettings.width.value -
                    ChicletSlicer.СhicletTotalInnerRightLeftPaddings -
                    ChicletSlicer.СellTotalInnerBorders -
                    settings.slicerTextCardSettings.outlineWeight.value;
                return textMeasurementService.getTailoredTextOrDefault(textProperties, maxWidth);
            });

            rowSelection.style("padding", PixelConverter.toString(settings.slicerTextCardSettings.padding.value));
            rowSelection
                .selectAll(ChicletSlicer.SlicerImgWrapperSelector.selectorName)
                .style("max-height", settings.imagesCardSettings.imageSplit.value + '%')
                .style("display", (dataPoint: ChicletSlicerDataPoint) => (dataPoint.imageURL)? 'flex' : 'none')
                .classed("hidden", (dataPoint: ChicletSlicerDataPoint) => {
                    if (!(dataPoint.imageURL)) { return true; }
                    if (settings.imagesCardSettings.imageSplit.value < ChicletSlicer.MinImageSplitToHide) { return true; }
                })
                .classed("imageRound", settings.imagesCardSettings.imageRound.value).classed("stretchImage", settings.imagesCardSettings.stretchImage.value)
                .classed("bottomImage", settings.imagesCardSettings.bottomImage.value).attr("src", (d: ChicletSlicerDataPoint) => { return d.imageURL ? d.imageURL : ''; });
            rowSelection.selectAll(ChicletSlicer.SlicerTextWrapperSelector.selectorName)
                .style('height', (d: ChicletSlicerDataPoint): string => {
                    let height: number = ChicletSlicer.MaxImageSplit;
                    if (d.imageURL) { height -= settings.imagesCardSettings.imageSplit.value; }
                    return `${height}%`;
                })
                .classed('hidden', () => {
                    if (settings.imagesCardSettings.imageSplit.value > ChicletSlicer.MaxImageSplitToHide) { return true; }
                });
            rowSelection.selectAll(ChicletSlicer.ItemContainerSelector.selectorName)
                .style("color", settings.slicerTextCardSettings.fontColor.value.value).style("border-style", this.getBorderStyle(settings.slicerTextCardSettings.outline))
                .style("border-color", settings.slicerTextCardSettings.outlineColor.value.value)
                .style("border-width", this.getBorderWidth(settings.slicerTextCardSettings.outline, settings.slicerTextCardSettings.outlineWeight.value))
                .style("font-size", PixelConverter.fromPoint(settings.slicerTextCardSettings.textSize.value))
                .style("border-radius", this.getBorderRadius(settings.slicerTextCardSettings.borderStyle.value.value.toString()));

            if (settings.slicerTextCardSettings.background.value.value) {
                const backgroundColor: string = hexToRGBString(settings.slicerTextCardSettings.background.value.value,
                                                (ChicletSlicer.MaxTransparency - settings.slicerTextCardSettings.transparency.value) / ChicletSlicer.MaxTransparency);
                this.slicerBody.style('background-color', backgroundColor);
            } else { this.slicerBody.style('background-color', null); }

            if (this.interactivityService && this.slicerBody) {
                this.interactivityService.applySelectionStateToData(data.slicerDataPoints);

                const slicerBody: Selection<any> = this.slicerBody.attr('width', this.currentViewport.width),
                    slicerItemContainers: Selection<any> = slicerBody.selectAll(ChicletSlicer.ItemContainerSelector.selectorName),
                    slicerItemLabels: Selection<any> = slicerBody.selectAll(ChicletSlicer.LabelTextSelector.selectorName),
                    slicerItemInputs: Selection<any> = slicerBody.selectAll(ChicletSlicer.InputSelector.selectorName),
                    slicerClear: Selection<any> = this.slicerHeader.select(ChicletSlicer.ClearSelector.selectorName);

                const behaviorOptions: ChicletSlicerBehaviorOptions = {
                    jsonFilters: this.jsonFilters,
                    visualHost: this.visualHost,
                    dataPoints: data.slicerDataPoints,
                    slicerItemContainers: slicerItemContainers,
                    slicerItemLabels: slicerItemLabels,
                    slicerItemInputs: slicerItemInputs,
                    slicerClear: slicerClear,
                    interactivityService: this.interactivityService,
                    slicerSettings: data.slicerSettings,
                    identityFields: data.identityFields,
                    isHighContrastMode: this.colorHelper.isHighContrast,
                    behavior: this.behavior,
                    interactivityServiceOptions: <InteractivityServiceOptions>{
                        hasSelectionOverride: data.hasSelectionOverride,
                    }
                };
                this.interactivityService.bind(behaviorOptions);
                this.renderTooltip(slicerItemContainers);
                this.behavior.styleSlicerInputs(rowSelection.select(ChicletSlicer.ItemContainerSelector.selectorName));
            }
            else { this.behavior.styleSlicerInputs(rowSelection.select(ChicletSlicer.ItemContainerSelector.selectorName)); }
        }
    }

    private createSearchHeader(container: Selection<any>): void {

        this.searchHeader = container
            .append("div")
            .classed("searchHeader", true)
            .classed("collapsed", true);

        this.searchHeader
            .append('div')
            .attr("title", "Search")
            .classed("search", true);

        this.searchInput = this.searchHeader
            .append('input')
            .attr("type", "text")
            .attr("drag-resize-disabled", "true")
            .classed("searchInput", true);

        
    }

    private handleSearchHeaderEvents(slicerDataPoints: ChicletSlicerDataPoint[]): void {
        // Filter chiclets based on search input
        this.searchInput.on("input", () => {
            const searchText: string = this.searchInput.node().value;
            const selfFilterEnabled: DataViewPropertyValue = this.dataView.metadata.objects?.general?.selfFilterEnabled;
            if (selfFilterEnabled && searchText != null) {
                const filteredDataPoints: ChicletSlicerDataPoint[] = ChicletSlicer.FILTER_DATA_POINTS_BY_TEXT(slicerDataPoints, searchText);
                this.render(filteredDataPoints);
            }
        });
    }

    private updateSearchHeader(): void {
        const selfFilterEnabled: DataViewPropertyValue = this.dataView.metadata.objects?.general?.selfFilterEnabled
        this.searchHeader.classed("show", selfFilterEnabled ? true : false);
        this.searchHeader.classed("collapsed", selfFilterEnabled ? false : true);
    }

    private getSearchHeaderHeight(): number {
        return this.searchHeader && this.searchHeader.classed('show')
            ? this.searchHeader.node().getBoundingClientRect().height
            : 0;
    }

    private getSlicerBodyViewport(currentViewport: IViewport): IViewport {
        const settings: ChicletSlicerSettingsModel = this.formattingSettings,
            selfFilterEnabled: DataViewPropertyValue = this.dataView.metadata.objects?.general?.selfFilterEnabled,
            headerHeight: number = (settings.headerCardSettings.show.value) ? this.getHeaderHeight() : 0,
            searchHeight: number = selfFilterEnabled ? this.getSearchHeaderHeight() : 0,
            borderHeight: number = settings.headerCardSettings.outlineWeight.value,
            height: number = currentViewport.height - (headerHeight + searchHeight + borderHeight + settings.headerCardSettings.borderBottomWidth),
            width: number = currentViewport.width - ChicletSlicer.WidthOfScrollbar;

        return {
            height: Math.max(height, ChicletSlicer.MinSizeOfViewport),
            width: Math.max(width, ChicletSlicer.MinSizeOfViewport)
        };
    }

    private updateSlicerBodyDimensions(slicerViewport: IViewport): void {
        this.slicerBody
            .style("height", PixelConverter.toString(slicerViewport.height))
            .style("width", `${ChicletSlicer.MaxImageWidth}%`);
    }

    public static getChicletTextProperties(textSize?: number): TextProperties {
        return <TextProperties>{
            fontFamily: ChicletSlicer.DefaultFontFamily,
            fontSize: PixelConverter.fromPoint(textSize || ChicletSlicer.DefaultFontSizeInPt),
        };
    }

    private getHeaderHeight(): number {
        return textMeasurementService.estimateSvgTextHeight(
            ChicletSlicer.getChicletTextProperties(this.formattingSettings.headerCardSettings.textSize.value));
    }

    private getRowHeight(): number {
        const textSettings = this.formattingSettings.slicerTextCardSettings;
        return textSettings.height.value !== 0
            ? textSettings.height.value
            : textMeasurementService.estimateSvgTextHeight(ChicletSlicer.getChicletTextProperties(textSettings.textSize.value));
    }

    private getBorderStyle(outlineElement: string): string {
        return outlineElement === '0px' ? 'none' : 'solid';
    }

    private getBorderWidth(outlineElement: string, outlineWeight: number): string {
        switch (outlineElement) {
            case 'None':
                return '0px';
            case 'BottomOnly':
                return '0px 0px ' + outlineWeight + 'px 0px';
            case 'TopOnly':
                return outlineWeight + 'px 0px 0px 0px';
            case 'TopBottom':
                return outlineWeight + 'px 0px ' + outlineWeight + 'px 0px';
            case 'LeftRight':
                return '0px ' + outlineWeight + 'px 0px ' + outlineWeight + 'px';
            case 'Frame':
                return outlineWeight + 'px';
            default:
                return outlineElement.replace("1", outlineWeight.toString());
        }
    }

    private getBorderRadius(borderType: string): string {
        switch (borderType) {
            case ChicletBorderStyle.ROUNDED:
                return "10px";
            case ChicletBorderStyle.SQUARE:
                return "0px";
            default:
                return "5px";
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {

        this.formattingSettings.setLocalizedOptions(this.localizationManager);
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    private catchExternalImage(slicerDataPoints: ChicletSlicerDataPoint[]) {
        if (!this.getExternalImageTelemetryTracedProperty()) {
            const hasExternalImageLink: boolean = lodashSome(
                slicerDataPoints,
                (dataPoint: ChicletSlicerDataPoint) => {
                    return ChicletSlicer.isExternalLink(dataPoint.imageURL);
                }
            );
            if (hasExternalImageLink) {
                this.telemetryTrace();
            }
        }
    }

    protected telemetryTrace()
    {
        this.visualHost.telemetry.trace(powerbiVisualsApi.VisualEventType.Trace, "External image link detected");
        this.externalImageTelemetryTraced();
    }

    public static isExternalLink(link: string): boolean {
        return /^(ftp|https|http):\/\/[^ "]+$/.test(link);
    }

    public getExternalImageTelemetryTracedProperty(): boolean {
        return this.ExternalImageTelemetryTraced;
    }

    public externalImageTelemetryTraced(): void {
        this.ExternalImageTelemetryTraced = true;
    }
}