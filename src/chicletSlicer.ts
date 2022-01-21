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

import * as d3 from "d3";
import * as lodash from "lodash";
import * as $ from "jquery";

import powerbiVisualsApi from "powerbi-visuals-api";
import powerbi = powerbiVisualsApi;

// d3
type Selection<T1, T2 = T1> = d3.Selection<any, T1, any, T2>;

// powerbi
import DataView = powerbi.DataView;
import IViewport = powerbi.IViewport;
import DataViewObjects = powerbi.DataViewObjects;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewCategoricalColumn = powerbi.DataViewCategoricalColumn;
import VisualObjectInstancesToPersist = powerbi.VisualObjectInstancesToPersist;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstanceEnumeration = powerbiVisualsApi.VisualObjectInstanceEnumeration;

import IVisual = powerbi.extensibility.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IColorPalette = powerbiVisualsApi.extensibility.IColorPalette;
import VisualUpdateOptions = powerbiVisualsApi.extensibility.visual.VisualUpdateOptions;
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;
import CustomVisualOpaqueIdentity = powerbi.visuals.CustomVisualOpaqueIdentity;

// powerbi.extensibility.utils.dataview
import { dataViewObjects as DataViewObjectsModule } from "powerbi-visuals-utils-dataviewutils";

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
import { textMeasurementService as tms, valueFormatter, } from "powerbi-visuals-utils-formattingutils";
import textMeasurementService = tms.textMeasurementService;
import TextProperties = tms.TextProperties;

import { ChicletSlicerData, ChicletSlicerDataPoint } from "./interfaces";
import { ChicletSlicerSettings } from "./settings";
import { ChicletSlicerBehaviorOptions, ChicletSlicerWebBehavior } from "./webBehavior";
import { ChicletSlicerConverter } from "./chicletSlicerConverter";
import { chicletSlicerProps } from "./chicletSlicerProps";
import { ITableView, TableViewFactory, TableViewViewOptions } from "./tableView";
import { BaseDataPoint, InteractivityServiceOptions } from "powerbi-visuals-utils-interactivityutils/lib/interactivityBaseService";

module ChicletBorderStyle {
    export let ROUNDED: string = 'Rounded';
    export let CUT: string = 'Cut';
    export let SQUARE: string = 'Square';
}

module ChicletSlicerShowDisabled {
    export let INPLACE: string = 'Inplace';
    export let BOTTOM: string = 'Bottom';
    export let HIDE: string = 'Hide';
}

export module Orientation {
    export let HORIZONTAL: string = 'Horizontal';
    export let VERTICAL: string = 'Vertical';
}

export class ChicletSlicer implements IVisual {
    private $root: JQuery;
    private $searchHeader: JQuery;
    private $searchInput: JQuery;
    private currentViewport: IViewport;
    private dataView: DataView;
    private slicerHeader: Selection<any>;
    private slicerBody: Selection<any>;
    private tableView: ITableView;
    private slicerData: ChicletSlicerData;

    private interactivityService: IInteractivityService<BaseDataPoint>;
    private visualHost: IVisualHost;

    private colorPalette: IColorPalette;
    private colorHelper: ColorHelper;

    private waitingForData: boolean;
    private isSelectionLoaded: boolean;

    /**
     * It's public for testability.
     */
    public behavior: ChicletSlicerWebBehavior;

    /**
     * It's public for testability.
     */
    public settings: ChicletSlicerSettings;

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

    private static MaxCellPadding: number = 20;
    private static MinSizeOfViewport: number = 0;
    private static MinColumns: number = 1;
    private static MaxColumns: number = 1000;
    private static MaxRows: number = 1000;
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

    public static DEFAULT_STYLE_PROPERTIES(): ChicletSlicerSettings {
        return {
            general: {
                orientation: Orientation.VERTICAL,
                columns: 3,
                rows: 0,
                multiselect: true,
                forcedSelection: false,
                showDisabled: ChicletSlicerShowDisabled.INPLACE,
                selection: null,
                selfFilterEnabled: false,
                filter: undefined,
            },
            margin: {
                top: 50,
                bottom: 50,
                right: 50,
                left: 50
            },
            header: {
                borderBottomWidth: 1,
                show: true,
                outline: 'BottomOnly',
                fontColor: '#a6a6a6',
                background: null,
                textSize: 10,
                outlineColor: '#a6a6a6',
                outlineWeight: 1,
                title: '',
            },
            headerText: {
                marginLeft: 5,
                marginTop: 0
            },
            slicerText: {
                textSize: 10,
                height: 0,
                width: 0,
                fontColor: '#666666',
                hoverColor: '#212121',
                selectedColor: '#BDD7EE',
                unselectedColor: '#ffffff',
                disabledColor: 'grey',
                marginLeft: 5,
                outline: 'Frame',
                background: null,
                transparency: 0,
                outlineColor: '#000000',
                outlineWeight: 1,
                padding: 3,
                borderStyle: 'Cut',

            },
            slicerItemContainer: {
                // The margin is assigned in the less file. This is needed for the height calculations.
                marginTop: 5,
                marginLeft: 0,
            },
            images: {
                imageSplit: 50,
                imageRound: false,
                stretchImage: false,
                bottomImage: false
            }
        };
    }

    /**
     * Public to testability.
     */
    public static GET_VALID_IMAGE_SPLIT(imageSplit): number {
        if (imageSplit < ChicletSlicer.MinImageSplit) {
            return ChicletSlicer.MinImageSplit;
        } else if (imageSplit > ChicletSlicer.MaxImageSplit) {
            return ChicletSlicer.MaxImageSplit;
        } else {
            return imageSplit;
        }
    }

    public static CONVERTER(
        dataView: DataView,
        searchText: string,
        visualHost: IVisualHost): ChicletSlicerData {

        if (!dataView ||
            !dataView.categorical ||
            !dataView.categorical.categories ||
            !dataView.categorical.categories[0] ||
            !dataView.categorical.categories[0].source ||
            !dataView.categorical.categories[0].source.roles ||
            !dataView.categorical.categories[0].source.roles["Category"] ||
            !dataView.categorical.categories[0].values ||
            !(dataView.categorical.categories[0].values.length > 0)) {
            return;
        }

        let converter: ChicletSlicerConverter = new ChicletSlicerConverter(dataView, visualHost);
        converter.convert();

        let slicerData: ChicletSlicerData,
            defaultSettings: ChicletSlicerSettings = this.DEFAULT_STYLE_PROPERTIES(),
            objects: DataViewObjects = dataView.metadata.objects;

        if (objects) {
            defaultSettings.general.orientation = DataViewObjectsModule.getValue<string>(objects, chicletSlicerProps.general.orientation, defaultSettings.general.orientation);
            defaultSettings.general.columns = DataViewObjectsModule.getValue<number>(objects, chicletSlicerProps.general.columns, defaultSettings.general.columns);
            defaultSettings.general.rows = DataViewObjectsModule.getValue<number>(objects, chicletSlicerProps.general.rows, defaultSettings.general.rows);
            defaultSettings.general.multiselect = DataViewObjectsModule.getValue<boolean>(objects, chicletSlicerProps.general.multiselect, defaultSettings.general.multiselect);
            defaultSettings.general.forcedSelection = DataViewObjectsModule.getValue<boolean>(objects, chicletSlicerProps.general.forcedSelection, defaultSettings.general.forcedSelection);
            defaultSettings.general.showDisabled = DataViewObjectsModule.getValue<string>(objects, chicletSlicerProps.general.showDisabled, defaultSettings.general.showDisabled);
            defaultSettings.general.selection = DataViewObjectsModule.getValue(dataView.metadata.objects, chicletSlicerProps.general.selection, defaultSettings.general.selection);
            defaultSettings.general.filter = DataViewObjectsModule.getValue(dataView.metadata.objects, chicletSlicerProps.general.filter, defaultSettings.general.filter);
            defaultSettings.general.selfFilterEnabled = DataViewObjectsModule.getValue<boolean>(objects, chicletSlicerProps.general.selfFilterEnabled, defaultSettings.general.selfFilterEnabled);

            defaultSettings.header.show = DataViewObjectsModule.getValue<boolean>(objects, chicletSlicerProps.header.show, defaultSettings.header.show);
            defaultSettings.header.title = DataViewObjectsModule.getValue<string>(objects, chicletSlicerProps.header.title, defaultSettings.header.title);
            defaultSettings.header.fontColor = DataViewObjectsModule.getFillColor(objects, chicletSlicerProps.header.fontColor, defaultSettings.header.fontColor);
            defaultSettings.header.background = DataViewObjectsModule.getFillColor(objects, chicletSlicerProps.header.background, defaultSettings.header.background);
            defaultSettings.header.textSize = DataViewObjectsModule.getValue<number>(objects, chicletSlicerProps.header.textSize, defaultSettings.header.textSize);
            defaultSettings.header.outline = DataViewObjectsModule.getValue<string>(objects, chicletSlicerProps.header.outline, defaultSettings.header.outline);
            defaultSettings.header.outlineColor = DataViewObjectsModule.getFillColor(objects, chicletSlicerProps.header.outlineColor, defaultSettings.header.outlineColor);
            defaultSettings.header.outlineWeight = DataViewObjectsModule.getValue<number>(objects, chicletSlicerProps.header.outlineWeight, defaultSettings.header.outlineWeight);

            defaultSettings.slicerText.textSize = DataViewObjectsModule.getValue<number>(objects, chicletSlicerProps.rows.textSize, defaultSettings.slicerText.textSize);
            defaultSettings.slicerText.height = DataViewObjectsModule.getValue<number>(objects, chicletSlicerProps.rows.height, defaultSettings.slicerText.height);
            defaultSettings.slicerText.width = DataViewObjectsModule.getValue<number>(objects, chicletSlicerProps.rows.width, defaultSettings.slicerText.width);
            defaultSettings.slicerText.selectedColor = DataViewObjectsModule.getFillColor(objects, chicletSlicerProps.rows.selectedColor, defaultSettings.slicerText.selectedColor);
            defaultSettings.slicerText.hoverColor = DataViewObjectsModule.getFillColor(objects, chicletSlicerProps.rows.hoverColor, defaultSettings.slicerText.hoverColor);
            defaultSettings.slicerText.unselectedColor = DataViewObjectsModule.getFillColor(objects, chicletSlicerProps.rows.unselectedColor, defaultSettings.slicerText.unselectedColor);
            defaultSettings.slicerText.disabledColor = DataViewObjectsModule.getFillColor(objects, chicletSlicerProps.rows.disabledColor, defaultSettings.slicerText.disabledColor);
            defaultSettings.slicerText.background = DataViewObjectsModule.getFillColor(objects, chicletSlicerProps.rows.background, defaultSettings.slicerText.background);
            defaultSettings.slicerText.transparency = DataViewObjectsModule.getValue<number>(objects, chicletSlicerProps.rows.transparency, defaultSettings.slicerText.transparency);
            defaultSettings.slicerText.fontColor = DataViewObjectsModule.getFillColor(objects, chicletSlicerProps.rows.fontColor, defaultSettings.slicerText.fontColor);
            defaultSettings.slicerText.outline = DataViewObjectsModule.getValue<string>(objects, chicletSlicerProps.rows.outline, defaultSettings.slicerText.outline);
            defaultSettings.slicerText.outlineColor = DataViewObjectsModule.getFillColor(objects, chicletSlicerProps.rows.outlineColor, defaultSettings.slicerText.outlineColor);
            defaultSettings.slicerText.outlineWeight = DataViewObjectsModule.getValue<number>(objects, chicletSlicerProps.rows.outlineWeight, defaultSettings.slicerText.outlineWeight);
            defaultSettings.slicerText.padding = DataViewObjectsModule.getValue<number>(objects, chicletSlicerProps.rows.padding, defaultSettings.slicerText.padding);
            defaultSettings.slicerText.borderStyle = DataViewObjectsModule.getValue<string>(objects, chicletSlicerProps.rows.borderStyle, defaultSettings.slicerText.borderStyle);

            defaultSettings.images.imageSplit = DataViewObjectsModule.getValue<number>(objects, chicletSlicerProps.images.imageSplit, defaultSettings.images.imageSplit);
            defaultSettings.images.imageRound = DataViewObjectsModule.getValue<boolean>(objects, chicletSlicerProps.images.imageRound, defaultSettings.images.imageRound);
            defaultSettings.images.stretchImage = DataViewObjectsModule.getValue<boolean>(objects, chicletSlicerProps.images.stretchImage, defaultSettings.images.stretchImage);
            defaultSettings.images.bottomImage = DataViewObjectsModule.getValue<boolean>(objects, chicletSlicerProps.images.bottomImage, defaultSettings.images.bottomImage);
        }

        if (defaultSettings.general.selfFilterEnabled && searchText) {
            searchText = searchText.toLowerCase();
            converter.dataPoints.forEach(x => x.filtered = x.category.toLowerCase().indexOf(searchText) < 0);
        }

        let categories: DataViewCategoricalColumn = dataView.categorical.categories[0];

        slicerData = {
            categorySourceName: categories.source.displayName,
            formatString: valueFormatter.getFormatStringByColumn(categories.source),
            slicerSettings: defaultSettings,
            slicerDataPoints: converter.dataPoints,
            identityFields: converter.identityFields,
            hasHighlights: converter.hasHighlights
        };

        // Override hasSelection if a objects contained more scopeIds than selections we found in the data
        slicerData.hasSelectionOverride = converter.hasSelectionOverride;

        return slicerData;
    }


    constructor(options: VisualConstructorOptions) {
        if (window.location !== window.parent.location) {
            require("core-js/stable");
        }

        this.$root = $(options.element);

        this.visualHost = options.host;

        this.colorPalette = this.visualHost.colorPalette;
        this.colorHelper = new ColorHelper(this.colorPalette);

        this.behavior = new ChicletSlicerWebBehavior();
        this.interactivityService = createInteractivitySelectionService(options.host);

        this.settings = ChicletSlicer.DEFAULT_STYLE_PROPERTIES();
    }

    public update(options: VisualUpdateOptions) {
        debugger;
        if (!options ||
            !options.dataViews ||
            !options.dataViews[0] ||
            !options.viewport) {
            return;
        }

        if (!this.currentViewport) {
            this.currentViewport = options.viewport;
            this.initContainer();
        }

        const existingDataView = this.dataView;
        this.dataView = options.dataViews[0];

        let resetScrollbarPosition: boolean = true;

        if (existingDataView) {
            resetScrollbarPosition = !ChicletSlicer.hasSameCategoryIdentity(existingDataView, this.dataView);
        }

        if (options.viewport.height === this.currentViewport.height
            && options.viewport.width === this.currentViewport.width) {
            this.waitingForData = false;
        }
        else {
            this.currentViewport = options.viewport;
        }

        this.updateInternal(resetScrollbarPosition);
    }

    private static hasSameCategoryIdentity(dataView1: DataView, dataView2: DataView): boolean {
        if (!dataView1 ||
            !dataView2 ||
            !dataView1.categorical ||
            !dataView2.categorical) {
            return false;
        }

        let dv1Categories: DataViewCategoricalColumn[] = dataView1.categorical.categories;
        let dv2Categories: DataViewCategoricalColumn[] = dataView2.categorical.categories;

        if (!dv1Categories ||
            !dv2Categories ||
            dv1Categories.length !== dv2Categories.length) {
            return false;
        }

        for (let i: number = 0, len: number = dv1Categories.length; i < len; i++) {
            let dv1Identity: CustomVisualOpaqueIdentity[] = (<DataViewCategoryColumn>dv1Categories[i]).identity;
            let dv2Identity: CustomVisualOpaqueIdentity[] = (<DataViewCategoryColumn>dv2Categories[i]).identity;

            let dv1Length: number = this.getLengthOptional(dv1Identity);
            if ((dv1Length < 1) || dv1Length !== this.getLengthOptional(dv2Identity)) {
                return false;
            }

            for (let j: number = 0; j < dv1Length; j++) {
                //if (!lodash.isEqual(dv1Identity[j].key, dv2Identity[j].key)) {
                return false;
                //}
            }
        }

        return true;
    }

    private static getLengthOptional(identity: CustomVisualOpaqueIdentity[]): number {
        if (identity) {
            return identity.length;
        }
        return 0;
    }

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
        let data: ChicletSlicerData = this.slicerData;

        if (!data) {
            return [];
        }

        switch (options.objectName) {
            case 'rows':
                return this.enumerateRows(data);
            case 'header':
                return this.enumerateHeader(data);
            case 'general':
                return this.enumerateGeneral(data);
            case 'images':
                return this.enumerateImages(data);
            default:
                return [];
        }
    }

    private enumerateHeader(data: ChicletSlicerData): VisualObjectInstance[] {
        let slicerSettings: ChicletSlicerSettings = this.settings;

        return [{
            selector: null,
            objectName: 'header',
            properties: {
                show: slicerSettings.header.show,
                title: slicerSettings.header.title,
                fontColor: slicerSettings.header.fontColor,
                background: slicerSettings.header.background,
                textSize: slicerSettings.header.textSize,
                outline: slicerSettings.header.outline,
                outlineColor: slicerSettings.header.outlineColor,
                outlineWeight: slicerSettings.header.outlineWeight
            }
        }];
    }

    private enumerateRows(data: ChicletSlicerData): VisualObjectInstance[] {
        let slicerSettings: ChicletSlicerSettings = this.settings;

        return [{
            selector: null,
            objectName: 'rows',
            properties: {
                textSize: slicerSettings.slicerText.textSize,
                height: slicerSettings.slicerText.height,
                width: slicerSettings.slicerText.width,
                background: slicerSettings.slicerText.background,
                transparency: slicerSettings.slicerText.transparency,
                selectedColor: slicerSettings.slicerText.selectedColor,
                hoverColor: slicerSettings.slicerText.hoverColor,
                unselectedColor: slicerSettings.slicerText.unselectedColor,
                disabledColor: slicerSettings.slicerText.disabledColor,
                outline: slicerSettings.slicerText.outline,
                outlineColor: slicerSettings.slicerText.outlineColor,
                outlineWeight: slicerSettings.slicerText.outlineWeight,
                fontColor: slicerSettings.slicerText.fontColor,
                padding: slicerSettings.slicerText.padding,
                borderStyle: slicerSettings.slicerText.borderStyle,
            }
        }];
    }

    private enumerateGeneral(data: ChicletSlicerData): VisualObjectInstance[] {
        let slicerSettings: ChicletSlicerSettings = this.settings;

        return [{
            selector: null,
            objectName: 'general',
            properties: {
                orientation: slicerSettings.general.orientation,
                columns: slicerSettings.general.columns,
                rows: slicerSettings.general.rows,
                showDisabled: slicerSettings.general.showDisabled,
                multiselect: slicerSettings.general.multiselect,
                forcedSelection: slicerSettings.general.forcedSelection
            }
        }];
    }

    private enumerateImages(data: ChicletSlicerData): VisualObjectInstance[] {
        let slicerSettings: ChicletSlicerSettings = this.settings;

        return [{
            selector: null,
            objectName: 'images',
            properties: {
                imageSplit: slicerSettings.images.imageSplit,
                imageRound: slicerSettings.images.imageRound,
                stretchImage: slicerSettings.images.stretchImage,
                bottomImage: slicerSettings.images.bottomImage,
            }
        }];
    }

    private changeColorsForHighContrast(settings: ChicletSlicerSettings): void {
        settings.header.fontColor = this.colorHelper.getHighContrastColor("foreground", settings.header.fontColor);
        settings.header.outlineColor = this.colorHelper.getHighContrastColor("foreground", settings.header.outlineColor);
        settings.header.background = this.colorHelper.getThemeColor();
        settings.slicerText.background = this.colorHelper.getThemeColor();

        settings.slicerText.fontColor = this.colorHelper.getHighContrastColor("foreground", settings.slicerText.fontColor);
        settings.slicerText.outlineColor = this.colorHelper.getHighContrastColor("foreground", settings.slicerText.outlineColor);
        settings.slicerText.hoverColor = this.colorHelper.getHighContrastColor("foreground", settings.slicerText.hoverColor);

        settings.slicerText.disabledColor = this.colorHelper.getThemeColor();
        settings.slicerText.selectedColor = this.colorHelper.getThemeColor();
        settings.slicerText.unselectedColor = this.colorHelper.getThemeColor();
    }

    private updateInternal(resetScrollbarPosition: boolean) {
        let data = ChicletSlicer.CONVERTER(
            this.dataView,
            this.$searchInput.val().toString(),
            this.visualHost);

        if (!data) {
            this.tableView.empty();

            return;
        }

        if (this.colorHelper.isHighContrast) {
            this.changeColorsForHighContrast(data.slicerSettings);
        }

        data.slicerSettings.header.outlineWeight = data.slicerSettings.header.outlineWeight < 0
            ? 0
            : data.slicerSettings.header.outlineWeight;

        data.slicerSettings.slicerText.outlineWeight = data.slicerSettings.slicerText.outlineWeight < 0
            ? 0
            : data.slicerSettings.slicerText.outlineWeight;

        data.slicerSettings.slicerText.padding = data.slicerSettings.slicerText.padding < 0
            ? 0
            : data.slicerSettings.slicerText.padding;

        data.slicerSettings.slicerText.height = data.slicerSettings.slicerText.height < 0
            ? 0
            : data.slicerSettings.slicerText.height;

        data.slicerSettings.slicerText.width = data.slicerSettings.slicerText.width < 0
            ? 0
            : data.slicerSettings.slicerText.width;

        data.slicerSettings.images.imageSplit = ChicletSlicer.GET_VALID_IMAGE_SPLIT(data.slicerSettings.images.imageSplit);

        const columns: number = data.slicerSettings.general.columns;
        const rows: number = data.slicerSettings.general.rows;

        data.slicerSettings.general.columns = columns <= 0
            ? +(data.slicerSettings.general.orientation === Orientation.VERTICAL && rows <= 0)
            : columns;

        data.slicerSettings.general.rows = rows <= 0
            ? +(data.slicerSettings.general.orientation === Orientation.HORIZONTAL && columns <= 0)
            : rows;

        data.slicerSettings.general.rows = data.slicerSettings.general.rows > ChicletSlicer.MaxRows
            ? ChicletSlicer.MaxRows
            : data.slicerSettings.general.rows;

        this.slicerData = data;
        this.settings = this.slicerData.slicerSettings;
        this.settings.header.title = this.settings.header.title.trim() || this.slicerData.categorySourceName;

        this.updateSearchHeader();
        this.updateSlicerBodyDimensions();

        if (this.settings.general.showDisabled === ChicletSlicerShowDisabled.BOTTOM) {
            data.slicerDataPoints = lodash.sortBy(data.slicerDataPoints, [x => !x.selectable]);
        } else if (this.settings.general.showDisabled === ChicletSlicerShowDisabled.HIDE) {
            data.slicerDataPoints = data.slicerDataPoints.filter(x => x.selectable);
        }

        if (this.settings.slicerText.height === ChicletSlicer.MinImageSplit) {
            let extraSpaceForCell = ChicletSlicer.СellTotalInnerPaddings + ChicletSlicer.СellTotalInnerBorders,
                textProperties: TextProperties = ChicletSlicer.GET_CHICLET_TEXT_PROPERTIES(this.settings.slicerText.textSize);

            this.settings.slicerText.height = textMeasurementService.estimateSvgTextHeight(textProperties) +
                textMeasurementService.estimateSvgTextBaselineDelta(textProperties) +
                extraSpaceForCell;

            let hasImage: boolean = lodash.some(data.slicerDataPoints, (dataPoint: ChicletSlicerDataPoint) => {
                return dataPoint.imageURL !== '' && typeof dataPoint.imageURL !== undefined;
            });

            if (hasImage) {
                this.settings.slicerText.height += ChicletSlicer.MaxImageSplit;
            }
        }

        this.tableView
            .rowHeight(this.settings.slicerText.height)
            .columnWidth(this.settings.slicerText.width)
            .orientation(this.settings.general.orientation)
            .rows(this.settings.general.rows)
            .columns(this.settings.general.columns)
            .data(
                data.slicerDataPoints.filter(x => !x.filtered),
                (d: ChicletSlicerDataPoint) => $.inArray(d, data.slicerDataPoints),
                resetScrollbarPosition)
            .viewport(this.getSlicerBodyViewport(this.currentViewport))
            .render();
    }

    private initContainer() {
        let settings: ChicletSlicerSettings = this.settings,
            slicerBodyViewport: IViewport = this.getSlicerBodyViewport(this.currentViewport);

        let slicerContainer: Selection<any> = d3.select(this.$root.get(0))
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
            .style("border-style", this.getBorderStyle(settings.header.outline))
            .style("border-color", settings.header.outlineColor)
            .style("border-width", this.getBorderWidth(settings.header.outline, settings.header.outlineWeight))
            .style("font-size", PixelConverter.fromPoint(settings.header.textSize));

        this.createSearchHeader($(slicerContainer.node()));

        this.slicerBody = slicerContainer
            .append('div')
            .classed(ChicletSlicer.BodySelector.className, true)
            .classed(
                ChicletSlicer.SlicerBodyHorizontalSelector.className,
                settings.general.orientation === Orientation.HORIZONTAL)
            .classed(
                ChicletSlicer.SlicerBodyVerticalSelector.className,
                settings.general.orientation === Orientation.VERTICAL
            )
            .style("height", PixelConverter.toString(slicerBodyViewport.height))
            .style("width", `${ChicletSlicer.MaxImageWidth}%`);

        let rowEnter = (rowSelection: Selection<any>) => {
            this.enterSelection(rowSelection);
        };

        let rowUpdate = (rowSelection: Selection<any>) => {
            this.selection(rowSelection);
        };

        let rowExit = (rowSelection: Selection<any>) => {
            rowSelection.remove();
        };

        let tableViewOptions: TableViewViewOptions = {
            rowHeight: this.getRowHeight(),
            columnWidth: this.settings.slicerText.width,
            orientation: this.settings.general.orientation,
            rows: this.settings.general.rows,
            columns: this.settings.general.columns,
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
        let settings: ChicletSlicerSettings = this.settings;

        let ulItemElement: Selection<any> = rowSelection
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

        let listItemElement: Selection<any> = ulItemElementMerged
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

        let slicerImgWrapperSelection: Selection<any> = listItemElementMerged
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

        let slicerTextWrapperSelection: Selection<any> = listItemElementMerged
            .selectAll(ChicletSlicer.SlicerTextWrapperSelector.selectorName)
            .data((dataPoint: ChicletSlicerDataPoint) => {
                return [dataPoint];
            });

        const slicerTextWrapperSelectionMerged = slicerTextWrapperSelection
            .enter()
            .append('div')
            .merge(slicerTextWrapperSelection);

        slicerImgWrapperSelectionMerged.classed(ChicletSlicer.SlicerTextWrapperSelector.className, true);

        let labelTextSelection: Selection<any> = slicerTextWrapperSelectionMerged
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
            .style("font-size", PixelConverter.fromPoint(settings.slicerText.textSize))
            .style("color", settings.slicerText.fontColor)
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
    };

    private selection(rowSelection: Selection<any>): void {
        let settings: ChicletSlicerSettings = this.settings,
            data: ChicletSlicerData = this.slicerData;

        if (data && settings) {
            this.slicerHeader
                .classed('hidden', !settings.header.show);

            this.slicerHeader
                .select(ChicletSlicer.HeaderTextSelector.selectorName)
                .text(settings.header.title.trim())
                .style("border-style", this.getBorderStyle(settings.header.outline))
                .style("border-color", settings.header.outlineColor)
                .style("border-width", this.getBorderWidth(settings.header.outline, settings.header.outlineWeight))
                .style("color", settings.header.fontColor)
                .style("background-color", settings.header.background)
                .style("font-size", PixelConverter.fromPoint(settings.header.textSize));

            this.slicerBody
                .classed(
                    ChicletSlicer.SlicerBodyHorizontalSelector.className,
                    settings.general.orientation === Orientation.HORIZONTAL)
                .classed(
                    ChicletSlicer.SlicerBodyVerticalSelector.className,
                    settings.general.orientation === Orientation.VERTICAL);

            let slicerText: Selection<any> = rowSelection.selectAll(ChicletSlicer.LabelTextSelector.selectorName),
                textProperties: TextProperties = ChicletSlicer.GET_CHICLET_TEXT_PROPERTIES(settings.slicerText.textSize),
                formatString: string = data.formatString;

            let slicerBodyViewport: IViewport = this.getSlicerBodyViewport(this.currentViewport);
            slicerText.text((d: ChicletSlicerDataPoint) => {
                textProperties.text = valueFormatter.format(d.category, formatString);

                if (this.settings.slicerText.width === 0) {
                    this.settings.slicerText.width = Math.round(
                        slicerBodyViewport.width / (this.tableView.computedColumns || ChicletSlicer.MinColumns)
                    );
                }

                let maxWidth: number = this.settings.slicerText.width -
                    ChicletSlicer.СhicletTotalInnerRightLeftPaddings -
                    ChicletSlicer.СellTotalInnerBorders -
                    settings.slicerText.outlineWeight;

                return textMeasurementService.getTailoredTextOrDefault(textProperties, maxWidth);
            });

            rowSelection
                .style("padding", PixelConverter.toString(settings.slicerText.padding));

            rowSelection
                .selectAll(ChicletSlicer.SlicerImgWrapperSelector.selectorName)
                .style("max-height", settings.images.imageSplit + '%')
                .style("display", (dataPoint: ChicletSlicerDataPoint) => (dataPoint.imageURL)
                    ? 'flex'
                    : 'none')
                .classed("hidden", (dataPoint: ChicletSlicerDataPoint) => {
                    if (!(dataPoint.imageURL)) {
                        return true;
                    }

                    if (settings.images.imageSplit < ChicletSlicer.MinImageSplitToHide) {
                        return true;
                    }
                })
                .classed("imageRound", settings.images.imageRound)
                .classed("stretchImage", settings.images.stretchImage)
                .classed("bottomImage", settings.images.bottomImage)
                .attr("src", (d: ChicletSlicerDataPoint) => {
                    return d.imageURL ? d.imageURL : '';
                });

            rowSelection.selectAll(ChicletSlicer.SlicerTextWrapperSelector.selectorName)
                .style('height', (d: ChicletSlicerDataPoint): string => {
                    let height: number = ChicletSlicer.MaxImageSplit;
                    if (d.imageURL) {
                        height -= settings.images.imageSplit;
                    }
                    return `${height}%`;
                })
                .classed('hidden', (d: ChicletSlicerDataPoint) => {
                    if (settings.images.imageSplit > ChicletSlicer.MaxImageSplitToHide) {
                        return true;
                    }
                });

            rowSelection.selectAll(ChicletSlicer.ItemContainerSelector.selectorName)
                .style("color", settings.slicerText.fontColor)
                .style("border-style", this.getBorderStyle(settings.slicerText.outline))
                .style("border-color", settings.slicerText.outlineColor)
                .style("border-width", this.getBorderWidth(settings.slicerText.outline, settings.slicerText.outlineWeight))
                .style("font-size", PixelConverter.fromPoint(settings.slicerText.textSize))
                .style("border-radius", this.getBorderRadius(settings.slicerText.borderStyle));

            if (settings.slicerText.background) {
                let backgroundColor: string = hexToRGBString(
                    settings.slicerText.background,
                    (ChicletSlicer.MaxTransparency - settings.slicerText.transparency) / ChicletSlicer.MaxTransparency);

                this.slicerBody.style('background-color', backgroundColor);
            }
            else {
                this.slicerBody.style('background-color', null);
            }

            if (this.interactivityService && this.slicerBody) {
                this.interactivityService.applySelectionStateToData(data.slicerDataPoints);

                let slicerBody: Selection<any> = this.slicerBody.attr('width', this.currentViewport.width),
                    slicerItemContainers: Selection<any> = slicerBody.selectAll(ChicletSlicer.ItemContainerSelector.selectorName),
                    slicerItemLabels: Selection<any> = slicerBody.selectAll(ChicletSlicer.LabelTextSelector.selectorName),
                    slicerItemInputs: Selection<any> = slicerBody.selectAll(ChicletSlicer.InputSelector.selectorName),
                    slicerClear: Selection<any> = this.slicerHeader.select(ChicletSlicer.ClearSelector.selectorName);

                let behaviorOptions: ChicletSlicerBehaviorOptions = {
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

                this.behavior.styleSlicerInputs(
                    rowSelection.select(ChicletSlicer.ItemContainerSelector.selectorName),
                    this.interactivityService.hasSelection());
            }
            else {
                this.behavior.styleSlicerInputs(rowSelection.select(ChicletSlicer.ItemContainerSelector.selectorName), false);
            }
        }
    };

    private createSearchHeader(container: JQuery): void {
        let counter: number = 0;

        this.$searchHeader = $("<div>")
            .appendTo(container)
            .addClass("searchHeader")
            .addClass("collapsed");

        $("<div>").appendTo(this.$searchHeader)
            .attr("title", "Search")
            .addClass("search");

        this.$searchInput = $("<input>").appendTo(this.$searchHeader)
            .attr("type", "text")
            .attr("drag-resize-disabled", "true")
            .addClass("searchInput")
            .on("input", () => this.visualHost.persistProperties(<VisualObjectInstancesToPersist>{
                merge: [{
                    objectName: "general",
                    selector: null,
                    properties: {
                        counter: counter++
                    }
                }]
            }));
    }

    private updateSearchHeader(): void {
        this.$searchHeader.toggleClass("show", this.slicerData.slicerSettings.general.selfFilterEnabled);
        this.$searchHeader.toggleClass("collapsed", !this.slicerData.slicerSettings.general.selfFilterEnabled);
    }

    private getSearchHeaderHeight(): number {
        return this.$searchHeader && this.$searchHeader.hasClass('show')
            ? this.$searchHeader.height()
            : 0;
    }

    private getSlicerBodyViewport(currentViewport: IViewport): IViewport {
        let settings: ChicletSlicerSettings = this.settings,
            headerHeight: number = (settings.header.show) ? this.getHeaderHeight() : 0,
            searchHeight: number = (settings.general.selfFilterEnabled) ? this.getSearchHeaderHeight() : 0,
            borderHeight: number = settings.header.outlineWeight,
            height: number = currentViewport.height - (headerHeight + searchHeight + borderHeight + settings.header.borderBottomWidth),
            width: number = currentViewport.width - ChicletSlicer.WidthOfScrollbar;

        return {
            height: Math.max(height, ChicletSlicer.MinSizeOfViewport),
            width: Math.max(width, ChicletSlicer.MinSizeOfViewport)
        };
    }

    private updateSlicerBodyDimensions(): void {
        let slicerViewport: IViewport = this.getSlicerBodyViewport(this.currentViewport);
        this.slicerBody
            .style("height", PixelConverter.toString(slicerViewport.height))
            .style("width", `${ChicletSlicer.MaxImageWidth}%`);
    }

    public static GET_CHICLET_TEXT_PROPERTIES(textSize?: number): TextProperties {
        return <TextProperties>{
            fontFamily: ChicletSlicer.DefaultFontFamily,
            fontSize: PixelConverter.fromPoint(textSize || ChicletSlicer.DefaultFontSizeInPt),
        };
    }

    private getHeaderHeight(): number {
        return textMeasurementService.estimateSvgTextHeight(
            ChicletSlicer.GET_CHICLET_TEXT_PROPERTIES(this.settings.header.textSize));
    }

    private getRowHeight(): number {
        let textSettings = this.settings.slicerText;
        return textSettings.height !== 0
            ? textSettings.height
            : textMeasurementService.estimateSvgTextHeight(ChicletSlicer.GET_CHICLET_TEXT_PROPERTIES(textSettings.textSize));
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
}
