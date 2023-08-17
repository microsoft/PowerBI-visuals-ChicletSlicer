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

import IVisual = powerbi.extensibility.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IColorPalette = powerbiVisualsApi.extensibility.IColorPalette;
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;
import VisualUpdateOptions = powerbiVisualsApi.extensibility.visual.VisualUpdateOptions;
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;

// powerbi.extensibility.utils.type
import { pixelConverter as PixelConverter } from "powerbi-visuals-utils-typeutils";

// powerbi.extensibility.utils.svg
import * as SVGUtil from "powerbi-visuals-utils-svgutils";
import ClassAndSelector = SVGUtil.CssConstants.ClassAndSelector;
import createClassAndSelector = SVGUtil.CssConstants.createClassAndSelector;

// powerbi.extensibility.utils.color
import { hexToRGBString, ColorHelper } from "powerbi-visuals-utils-colorutils";

// powerbi.extensibility.utils.formatting
import { textMeasurementService, valueFormatter, interfaces } from "powerbi-visuals-utils-formattingutils";
import TextProperties = interfaces.TextProperties;

import { ChicletSlicerData, ChicletSlicerDataPoint, Orientation } from "./interfaces";
import { ChicletSlicerSettingsModel, TooltipsCardSettings, SlicerTextCardSettings, HeaderCardSettings, SlicerItemContainer } from "./chicletSlicerSettingsModel";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { ChicletSlicerBehaviorOptions, ChicletSlicerWebBehavior } from "./webBehavior";
import { ChicletSlicerConverter } from "./chicletSlicerConverter";
import { ITableView, TableView, TableViewViewOptions } from "./tableView";

import { createTooltipServiceWrapper, ITooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";
import VisualTooltipDataItem = powerbiVisualsApi.extensibility.VisualTooltipDataItem;

import { ExternalLinksTelemetry } from "./telemetry";

import IFilter = powerbi.IFilter;
import ISelectionManager = powerbiVisualsApi.extensibility.ISelectionManager;

const enum ChicletBorderStyle {
    ROUNDED = "Rounded",
    CUT = "Cut",
    SQUARE = "Square"
}

const enum ChicletSlicerShowDisabled {
    INPLACE = "Inplace",
    BOTTOM = "Bottom",
    HIDE = "Hide"
}
export class ChicletSlicer implements IVisual {
    private root: Selection<any>;
    private searchHeader: Selection<any>;
    private searchInput: Selection<any>;
    private currentViewport: IViewport;
    private slicerHeader: Selection<any>;
    private slicerBody: Selection<any>;
    private tableView: ITableView;

    public formattingSettings: ChicletSlicerSettingsModel;

    private visualHost: IVisualHost;

    private colorPalette: IColorPalette;
    private colorHelper: ColorHelper;

    private jsonFilters: IFilter[] | any[];
    private tooltipService: ITooltipServiceWrapper;
    private selectionManager: ISelectionManager;

    private localizationManager: ILocalizationManager;

    private ExternalImageTelemetryTraced: boolean = false;
    private resetScrollbarPosition: boolean;

    /**
     * It's public for testability.
     */
    public behavior: ChicletSlicerWebBehavior;
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

    private telemetry: ExternalLinksTelemetry;

    constructor(options: VisualConstructorOptions) {
        this.root = d3Select(options.element);

        this.visualHost = options.host;

        this.colorPalette = this.visualHost.colorPalette;
        this.colorHelper = new ColorHelper(this.colorPalette);

        this.localizationManager = options.host.createLocalizationManager();
        this.formattingSettingsService = new FormattingSettingsService(this.localizationManager);

        this.behavior = new ChicletSlicerWebBehavior();

        this.tooltipService = createTooltipServiceWrapper(
            this.visualHost.tooltipService,
            options.element
        );

        this.telemetry = new ExternalLinksTelemetry(this.visualHost.telemetry);
        this.selectionManager = options.host.createSelectionManager();

        this.initContainer();
        /* Disable ContectMenu by default */
        //this.renderContextMenu();
    }

    public update(options: VisualUpdateOptions) {
        this.visualHost.eventService.renderingStarted(options);

        if (!options ||
            !options.dataViews ||
            !options.dataViews.length ||
            !options.dataViews[0]?.categorical?.categories?.length ||
            !options.dataViews[0]?.categorical?.categories[0]?.values ||
            !options.viewport) {

            this.clear();
            this.visualHost.eventService.renderingFailed(options, "No data or viewport");
            return;
        }

        this.resetScrollbarPosition = false;

        this.jsonFilters = options.jsonFilters;
        if (this.jsonFilters && this.jsonFilters[0] && this.jsonFilters[0]?.target.length === 0) {
            this.resetScrollbarPosition = true;
        }

        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(ChicletSlicerSettingsModel, options.dataViews);
        this.formattingSettings.setLocalizedOptions(this.localizationManager);

        const slicerData: ChicletSlicerData = ChicletSlicer.converter(
            options.dataViews[0],
            this?.searchInput?.node()?.value,
            this.formattingSettings,
            this.visualHost,
            options.jsonFilters);

        if (!slicerData) {
            this.clear();
            this.visualHost.eventService.renderingFailed(options, "No data or viewport");
            return;
        }

        this.currentViewport = options.viewport;

        this.updateContainer(options.viewport, slicerData);

        this.updateInternal(slicerData);

        this.visualHost.eventService.renderingFinished(options);

        this.telemetry.detectExternalImages(slicerData.slicerDataPoints);
    }

    private clear() {
        this.tableView && this.tableView.empty();
    }

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

    public static converter(
        dataView: DataView,
        searchText: string,
        formattingSettings: ChicletSlicerSettingsModel,
        visualHost: IVisualHost,
        jsonFilters: IFilter[] | any[]): ChicletSlicerData {
        const categories: DataViewCategoryColumn = dataView?.categorical?.categories?.length && dataView.categorical.categories[0];

        if (!categories?.source?.roles ||
            !categories.source.roles["Category"] ||
            !categories?.values?.length) {
            return;
        }

        const converter: ChicletSlicerConverter = new ChicletSlicerConverter(dataView, visualHost, jsonFilters);
        converter.convert();

        const selfFilterEnabled: boolean = !!(dataView.metadata.objects?.general?.selfFilterEnabled);

        let dataPoints: ChicletSlicerDataPoint[] = converter.dataPoints;
        if (selfFilterEnabled && searchText) {
            dataPoints = ChicletSlicer.filterDataPoints(converter.dataPoints, searchText);
        }

        const slicerData: ChicletSlicerData = {
            categorySourceName: categories.source.displayName,
            formatString: valueFormatter.getFormatStringByColumn(categories.source),
            formattingSettings: formattingSettings,
            selfFilterEnabled: selfFilterEnabled,
            slicerDataPoints: dataPoints
        };

        return slicerData;
    }

    public static filterDataPoints(dataPoints: ChicletSlicerDataPoint[], searchText: string): ChicletSlicerDataPoint[] {
        searchText = searchText.toLowerCase();
        dataPoints.forEach(x => x.filtered = x.category.toLowerCase().indexOf(searchText) < 0);
        return dataPoints;
    }


    private renderContextMenu() {
        this.root.on('contextmenu', (event) => {
            const dataPoint: any = d3Select(event.target).datum();
            this.selectionManager.showContextMenu((dataPoint && dataPoint.identity) ? dataPoint.identity : {}, { x: event.clientX, y: event.clientY });
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
            this.clear();
            return;
        }

        if (this.colorHelper.isHighContrast) {
            this.changeColorsForHighContrast(data.formattingSettings);
        }

        data.formattingSettings.headerCardSettings.outlineWeight.value = data.formattingSettings.headerCardSettings.outlineWeight.value < 0
            ? 0 : data.formattingSettings.headerCardSettings.outlineWeight.value;

        data.formattingSettings.slicerTextCardSettings.outlineWeight.value = data.formattingSettings.slicerTextCardSettings.outlineWeight.value < 0
            ? 0 : data.formattingSettings.slicerTextCardSettings.outlineWeight.value;

        data.formattingSettings.slicerTextCardSettings.padding.value = data.formattingSettings.slicerTextCardSettings.padding.value < 0
            ? 0 : data.formattingSettings.slicerTextCardSettings.padding.value;

        data.formattingSettings.slicerTextCardSettings.height.value = data.formattingSettings.slicerTextCardSettings.height.value < 0
            ? 0 : data.formattingSettings.slicerTextCardSettings.height.value;

        data.formattingSettings.slicerTextCardSettings.width.value = data.formattingSettings.slicerTextCardSettings.width.value < 0
            ? 0 : data.formattingSettings.slicerTextCardSettings.width.value;

        data.formattingSettings.imagesCardSettings.imageSplit.value = ChicletSlicer.getValidImageSplit(data.formattingSettings.imagesCardSettings.imageSplit.value);

        const columns: number = data.formattingSettings.generalCardSettings.columns.value;
        const rows: number = data.formattingSettings.generalCardSettings.rows.value;

        data.formattingSettings.generalCardSettings.columns.value = columns <= 0
            ? +(data.formattingSettings.generalCardSettings.orientation.value.value === Orientation.VERTICAL && rows <= 0) : columns;

        data.formattingSettings.generalCardSettings.rows.value = rows <= 0
            ? +(data.formattingSettings.generalCardSettings.orientation.value.value === Orientation.HORIZONTAL && columns <= 0) : rows;

        data.formattingSettings.headerCardSettings.title.value = data.formattingSettings.headerCardSettings.title.value.trim() || data.categorySourceName;

        this.updateSearchHeader(data.slicerDataPoints, data.formattingSettings, data.selfFilterEnabled);
        this.updateSlicerBodyDimensions(data.formattingSettings.headerCardSettings, data.selfFilterEnabled);

        if (data.formattingSettings.generalCardSettings.showDisabled.value.value === ChicletSlicerShowDisabled.BOTTOM) {
            data.slicerDataPoints = lodashSortby(data.slicerDataPoints, [x => !x.selectable]);
        } else if (data.formattingSettings.generalCardSettings.showDisabled.value.value === ChicletSlicerShowDisabled.HIDE) {
            data.slicerDataPoints = data.slicerDataPoints.filter(x => x.selectable);
        }

        if (data.formattingSettings.slicerTextCardSettings.height.value === ChicletSlicer.MinImageSplit) {
            const extraSpaceForCell = ChicletSlicer.СellTotalInnerPaddings + ChicletSlicer.СellTotalInnerBorders,
                textProperties: TextProperties = ChicletSlicer.getChicletTextProperties(data.formattingSettings.slicerTextCardSettings.textSize.value);

            data.formattingSettings.slicerTextCardSettings.height.value = textMeasurementService.estimateSvgTextHeight(textProperties) +
                textMeasurementService.estimateSvgTextBaselineDelta(textProperties) +
                extraSpaceForCell;

            const hasImage: boolean = data.slicerDataPoints.some((dataPoint: ChicletSlicerDataPoint) => {
                return dataPoint?.imageURL && dataPoint.imageURL !== '';
            });

            if (hasImage) {
                data.formattingSettings.slicerTextCardSettings.height.value += ChicletSlicer.MaxImageSplit;
            }
        }

        this.render(data.slicerDataPoints, data.formattingSettings, data.selfFilterEnabled);
    }

    private render(datapoints: ChicletSlicerDataPoint[], formattingSettings: ChicletSlicerSettingsModel, selfFilterEnabled: boolean) {
        this.tableView
            .rowHeight(formattingSettings.slicerTextCardSettings.height.value)
            .columnWidth(formattingSettings.slicerTextCardSettings.width.value)
            .orientation(formattingSettings.generalCardSettings.orientation.value.value.toString())
            .rows(formattingSettings.generalCardSettings.rows.value)
            .columns(formattingSettings.generalCardSettings.columns.value)
            .data(
                datapoints.filter(x => !x.filtered),
                (d: ChicletSlicerDataPoint) => datapoints.indexOf(d),
                this.resetScrollbarPosition)
            .viewport(this.getSlicerBodyViewport(this.currentViewport, formattingSettings.headerCardSettings, selfFilterEnabled))
            .render();
    }

    private renderTooltip(selection: Selection<any>, tooltipsCardSettings: TooltipsCardSettings): void {
        if (!this.tooltipService) {
            return;
        }

        this.tooltipService.addTooltip(
            selection,
            (data: ChicletSlicerDataPoint) => ChicletSlicer.getTooltipData(data, tooltipsCardSettings),
            (data: ChicletSlicerDataPoint) => data.identity
        );
    }

    private static getTooltipData(value: any, tooltipsCardSettings: TooltipsCardSettings): VisualTooltipDataItem[] {
        if (tooltipsCardSettings.show.value) {
            return [{
                displayName: value.columnName,
                value: value.category,
            }];
        }

        return null;
    }

    private initContainer() {
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

        this.createSearchHeader(slicerContainer);

        this.slicerBody = slicerContainer
            .append('div')
            .classed(ChicletSlicer.BodySelector.className, true)

        this.slicerBody
            .append('div')
            .classed('scrollRegion', true)
            .append('div')
            .classed('visibleGroup', true);

        return;
    }


    private updateContainer(currentViewport: IViewport, data: ChicletSlicerData) {
        const settings: ChicletSlicerSettingsModel = data.formattingSettings,
            slicerBodyViewport: IViewport = this.getSlicerBodyViewport(currentViewport, settings.headerCardSettings, data.selfFilterEnabled);

        this.slicerHeader
            .style("margin-left", PixelConverter.toString(settings.headerText.marginLeft))
            .style("margin-top", PixelConverter.toString(settings.headerText.marginTop))
            .style("border-style", ChicletSlicer.getBorderStyle(settings.headerCardSettings.outline.value.value.toString()))
            .style("border-color", settings.headerCardSettings.outlineColor.value.value)
            .style("border-width", ChicletSlicer.getBorderWidth(settings.headerCardSettings.outline.value.value.toString(), settings.headerCardSettings.outlineWeight.value))
            .style("font-size", PixelConverter.fromPoint(settings.headerCardSettings.textSize.value));

        this.slicerBody
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
            ChicletSlicer.enterSelection(rowSelection, settings.slicerTextCardSettings, settings.slicerItemContainer);
        };

        const rowUpdate = (rowSelection: Selection<any>) => {
            this.selection(rowSelection, data);
        };

        const rowExit = (rowSelection: Selection<any>) => {
            rowSelection.remove();
        };

        const tableViewOptions: TableViewViewOptions = {
            rowHeight: ChicletSlicer.getRowHeight(settings.slicerTextCardSettings),
            columnWidth: settings.slicerTextCardSettings.width.value,
            orientation: settings.generalCardSettings.orientation.value.value.toString(),
            rows: settings.generalCardSettings.rows.value,
            columns: settings.generalCardSettings.columns.value,
            enter: rowEnter,
            exit: rowExit,
            update: rowUpdate,
            scrollEnabled: true,
            viewport: slicerBodyViewport,
            baseContainer: this.slicerBody,
        };

        this.tableView = new TableView(tableViewOptions);
    }

    private static enterSelection(rowSelection: Selection<any>, slicerTextCardSettings: SlicerTextCardSettings, slicerItemContainer: SlicerItemContainer): void {
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

        listItemElementMerged.style("margin-left", PixelConverter.toString(slicerItemContainer.marginLeft));

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
            .style("font-size", PixelConverter.fromPoint(slicerTextCardSettings.textSize.value))
            .style("color", slicerTextCardSettings.fontColor.value.value)
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
        const settings = data.formattingSettings;

        if (data && settings) {
            this.slicerHeader.classed('hidden', !settings.headerCardSettings.show.value);

            this.slicerHeader
                .select(ChicletSlicer.HeaderTextSelector.selectorName).text(settings.headerCardSettings.title.value.trim())
                .style("border-style", ChicletSlicer.getBorderStyle(settings.headerCardSettings.outline.value.value.toString())).style("border-color", settings.headerCardSettings.outlineColor.value.value)
                .style("border-width", ChicletSlicer.getBorderWidth(settings.headerCardSettings.outline.value.value.toString(), settings.headerCardSettings.outlineWeight.value))
                .style("color", settings.headerCardSettings.fontColor.value.value).style("background-color", settings.headerCardSettings.background.value.value)
                .style("font-size", PixelConverter.fromPoint(settings.headerCardSettings.textSize.value));

            this.slicerBody.classed(ChicletSlicer.SlicerBodyHorizontalSelector.className, settings.generalCardSettings.orientation.value.value === Orientation.HORIZONTAL)
                .classed(ChicletSlicer.SlicerBodyVerticalSelector.className, settings.generalCardSettings.orientation.value.value === Orientation.VERTICAL);

            const slicerText: Selection<any> = rowSelection.selectAll(ChicletSlicer.LabelTextSelector.selectorName),
                textProperties: TextProperties = ChicletSlicer.getChicletTextProperties(settings.slicerTextCardSettings.textSize.value),
                formatString: string = data.formatString;

            const slicerBodyViewport: IViewport = this.getSlicerBodyViewport(this.currentViewport, settings.headerCardSettings, data.selfFilterEnabled);

            slicerText.text((d: ChicletSlicerDataPoint) => {
                textProperties.text = valueFormatter.format(d.category, formatString);
                if (settings.slicerTextCardSettings.width.value === 0) {
                    settings.slicerTextCardSettings.width.value = Math.round(slicerBodyViewport.width / (this.tableView.computedColumns || ChicletSlicer.MinColumns));
                }
                const maxWidth: number = settings.slicerTextCardSettings.width.value -
                    ChicletSlicer.СhicletTotalInnerRightLeftPaddings -
                    ChicletSlicer.СellTotalInnerBorders -
                    settings.slicerTextCardSettings.outlineWeight.value;
                return textMeasurementService.getTailoredTextOrDefault(textProperties, maxWidth);
            });

            rowSelection.style("padding", PixelConverter.toString(settings.slicerTextCardSettings.padding.value));
            rowSelection
                .selectAll(ChicletSlicer.SlicerImgWrapperSelector.selectorName)
                .style("max-height", settings.imagesCardSettings.imageSplit.value + '%')
                .style("display", (dataPoint: ChicletSlicerDataPoint) => (dataPoint.imageURL) ? 'flex' : 'none')
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
                .style("color", settings.slicerTextCardSettings.fontColor.value.value).style("border-style", ChicletSlicer.getBorderStyle(settings.slicerTextCardSettings.outline))
                .style("border-color", settings.slicerTextCardSettings.outlineColor.value.value)
                .style("border-width", ChicletSlicer.getBorderWidth(settings.slicerTextCardSettings.outline, settings.slicerTextCardSettings.outlineWeight.value))
                .style("font-size", PixelConverter.fromPoint(settings.slicerTextCardSettings.textSize.value))
                .style("border-radius", ChicletSlicer.getBorderRadius(settings.slicerTextCardSettings.borderStyle.value.value.toString()));

            if (settings.slicerTextCardSettings.background.value.value) {
                const backgroundColor: string = hexToRGBString(settings.slicerTextCardSettings.background.value.value,
                    (ChicletSlicer.MaxTransparency - settings.slicerTextCardSettings.transparency.value) / ChicletSlicer.MaxTransparency);
                this.slicerBody.style('background-color', backgroundColor);
            } else { this.slicerBody.style('background-color', null); }


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
                formattingSettings: data.formattingSettings,
                isHighContrastMode: this.colorHelper.isHighContrast
            };

            this.behavior.bindEvents(behaviorOptions);

            this.renderTooltip(slicerItemContainers, settings.tooltipsCardSettings);
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

    private updateSearchHeader(slicerDataPoints: ChicletSlicerDataPoint[], formattingSettings: ChicletSlicerSettingsModel, selfFilterEnabled: boolean): void {
        this.searchHeader.classed("show", selfFilterEnabled);
        this.searchHeader.classed("collapsed", !selfFilterEnabled);

        // Filter chiclets based on search input
        this.searchInput.on("input", () => {
            const searchText: string = this.searchInput.node().value;
            if (selfFilterEnabled && searchText != null) {
                const dataPoints: ChicletSlicerDataPoint[] = ChicletSlicer.filterDataPoints(slicerDataPoints, searchText);
                this.render(dataPoints, formattingSettings, selfFilterEnabled);
            }
        });
    }

    private getSearchHeaderHeight(): number {
        return this.searchHeader && this.searchHeader.classed('show')
            ? this.searchHeader.node().getBoundingClientRect().height
            : 0;
    }

    private getSlicerBodyViewport(currentViewport: IViewport, headerCardSettings: HeaderCardSettings, selfFilterEnabled: boolean): IViewport {
        const headerHeight: number = (headerCardSettings.show.value) ? ChicletSlicer.getHeaderHeight(headerCardSettings) : 0,
            searchHeight: number = selfFilterEnabled ? this.getSearchHeaderHeight() : 0,
            borderHeight: number = headerCardSettings.outlineWeight.value,
            height: number = currentViewport.height - (headerHeight + searchHeight + borderHeight + headerCardSettings.borderBottomWidth),
            width: number = currentViewport.width - ChicletSlicer.WidthOfScrollbar;

        return {
            height: Math.max(height, ChicletSlicer.MinSizeOfViewport),
            width: Math.max(width, ChicletSlicer.MinSizeOfViewport)
        };
    }

    private updateSlicerBodyDimensions(headerCardSettings: HeaderCardSettings, selfFilterEnabled: boolean): void {
        const slicerViewport: IViewport = this.getSlicerBodyViewport(this.currentViewport, headerCardSettings, selfFilterEnabled);
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

    private static getHeaderHeight(headerCardSettings: HeaderCardSettings): number {
        return textMeasurementService.estimateSvgTextHeight(
            ChicletSlicer.getChicletTextProperties(headerCardSettings.textSize.value));
    }

    private static getRowHeight(textSettings: SlicerTextCardSettings): number {
        return textSettings.height.value !== 0
            ? textSettings.height.value
            : textMeasurementService.estimateSvgTextHeight(ChicletSlicer.getChicletTextProperties(textSettings.textSize.value));
    }

    private static getBorderStyle(outlineElement: string): string {
        return outlineElement === '0px' ? 'none' : 'solid';
    }

    private static getBorderWidth(outlineElement: string, outlineWeight: number): string {
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

    private static getBorderRadius(borderType: string): string {
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
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings)
    }
}