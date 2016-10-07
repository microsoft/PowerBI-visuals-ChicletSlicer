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

module powerbi.extensibility.visual {

    // jsCommon
    import ClassAndSelector = jsCommon.CssConstants.ClassAndSelector;
    import createClassAndSelector = jsCommon.CssConstants.createClassAndSelector;
    import PixelConverter = jsCommon.PixelConverter;

    // powerbi
    import IViewport = powerbi.IViewport;
    import DataViewObjectPropertyIdentifier = powerbi.DataViewObjectPropertyIdentifier;
    import IEnumType = powerbi.IEnumType;
    import createEnumType = powerbi.createEnumType;
    import IVisual = powerbi.IVisual;
    import IVisualHostServices = powerbi.IVisualHostServices;
    import DataView = powerbi.DataView;
    import DataViewObjects = powerbi.DataViewObjects;
    import DataViewCategoricalColumn = powerbi.DataViewCategoricalColumn;
    import VisualCapabilities = powerbi.VisualCapabilities;
    import VisualDataRoleKind = powerbi.VisualDataRoleKind;
    import SelectEventArgs = powerbi.SelectEventArgs;
    import VisualUpdateOptions = powerbi.VisualUpdateOptions;
    import DataViewAnalysis = powerbi.DataViewAnalysis;
    import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
    import VisualObjectInstance = powerbi.VisualObjectInstance;
    import VisualObjectInstancesToPersist = powerbi.VisualObjectInstancesToPersist;
    import TextMeasurementService = powerbi.TextMeasurementService;
    import TextProperties = powerbi.TextProperties;
    import DataViewCategorical = powerbi.DataViewCategorical;
    import DataViewMetadata = powerbi.DataViewMetadata;
    import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
    import DataViewScopeIdentity = powerbi.DataViewScopeIdentity;
    import VisualInitOptions = powerbi.VisualInitOptions;

    // powerbi.data
    import SemanticFilter = powerbi.data.SemanticFilter;
    import SQExprConverter = powerbi.data.SQExprConverter;
    import Selector = powerbi.data.Selector;
    import SQExpr = powerbi.data.SQExpr;

    // powerbi.visuals
    import SelectableDataPoint = powerbi.visuals.SelectableDataPoint;
    import IMargin = powerbi.visuals.IMargin;
    import IInteractivityService = powerbi.visuals.IInteractivityService;
    import valueFormatter = powerbi.visuals.valueFormatter;
    import createInteractivityService = powerbi.visuals.createInteractivityService;
    import isCategoryColumnSelected = powerbi.visuals.isCategoryColumnSelected;
    import converterHelper = powerbi.visuals.converterHelper;
    import SelectionId = powerbi.visuals.SelectionId;
    import IInteractiveBehavior = powerbi.visuals.IInteractiveBehavior;
    import ISelectionHandler = powerbi.visuals.ISelectionHandler;
    import SelectionIdBuilder = powerbi.visuals.SelectionIdBuilder;

    export interface ITableView {
        data(data: any[], dataIdFunction: (d) => {}, dataAppended: boolean): ITableView;
        rowHeight(rowHeight: number): ITableView;
        columnWidth(columnWidth: number): ITableView;
        orientation(orientation: string): ITableView;
        rows(rows: number): ITableView;
        columns(columns: number): ITableView;
        viewport(viewport: IViewport): ITableView;
        render(): void;
        empty(): void;
        computedColumns: number;
        computedRows: number;
    }

    export module TableViewFactory {
        export function createTableView(options): ITableView {
            return new TableView(options);
        }
    }

    export interface TableViewViewOptions {
        enter: (selection: d3.Selection) => void;
        exit: (selection: D3.Selection) => void;
        update: (selection: D3.Selection) => void;
        loadMoreData: () => void;
        baseContainer: D3.Selection;
        rowHeight: number;
        columnWidth: number;
        orientation: string;
        rows: number;
        columns: number;
        viewport: IViewport;
        scrollEnabled: boolean;
    }

    export interface TableViewGroupedData {
        data: any[];
        totalColumns: number;
        totalRows: number;
    }

    export interface TableViewComputedOptions {
        columns: number;
        rows: number;
    }

    /**
     * A UI Virtualized List, that uses the D3 Enter, Update & Exit pattern to update rows.
     * It can create lists containing either HTML or SVG elements.
     */
    export class TableView implements ITableView {
        public static RowSelector: ClassAndSelector = createClassAndSelector('row');
        public static CellSelector: ClassAndSelector = createClassAndSelector('cell');

        private static defaultRowHeight = 0;
        private static defaultColumns = 1;

        private getDatumIndex: (d: any) => {};
        private _data: any[];
        private _totalRows: number;
        private _totalColumns: number;

        private options: TableViewViewOptions;
        private visibleGroupContainer: D3.Selection;
        private scrollContainer: D3.Selection;

        private computedOptions: TableViewComputedOptions;

        public constructor(options: TableViewViewOptions) {
            // make a copy of options so that it is not modified later by caller
            this.options = $.extend(true, {}, options);

            this.options.baseContainer
                .style('overflow-y', 'auto')
                .attr('drag-resize-disabled', true);

            this.scrollContainer = options.baseContainer
                .append('div')
                .attr('class', 'scrollRegion');

            this.visibleGroupContainer = this.scrollContainer
                .append('div')
                .attr('class', 'visibleGroup');

            TableView.SetDefaultOptions(options);
        }

        private static SetDefaultOptions(options: TableViewViewOptions) {
            options.rowHeight = options.rowHeight || TableView.defaultRowHeight;
        }

        public get computedColumns(): number {
            return this.computedOptions
                ? this.computedOptions.columns
                : 0;
        }

        public get computedRows(): number {
            return this.computedOptions
                ? this.computedOptions.rows
                : 0;
        }

        public rowHeight(rowHeight: number): TableView {
            this.options.rowHeight = Math.ceil(rowHeight);

            return this;
        }

        public columnWidth(columnWidth: number): TableView {
            this.options.columnWidth = Math.ceil(columnWidth);

            return this;
        }

        public orientation(orientation: string): TableView {
            this.options.orientation = orientation;

            return this;
        }

        public rows(rows: number): TableView {
            this.options.rows = Math.ceil(rows);

            return this;
        }

        public columns(columns: number): TableView {
            this.options.columns = Math.ceil(columns);

            return this;
        }

        public data(data: any[], getDatumIndex: (d) => {}, dataReset: boolean = false): ITableView {
            this._data = data;
            this.getDatumIndex = getDatumIndex;

            this.setTotalRows();

            if (dataReset) {
                $(this.options.baseContainer.node()).scrollTop(0);
            }

            return this;
        }

        public viewport(viewport: IViewport): ITableView {
            this.options.viewport = viewport;

            return this;
        }

        public empty(): ITableView {
            this._data = [];
            this.render();

            return this;
        }

        private setTotalRows(): void {
            var count: number = this._data.length,
                rows: number = Math.min(this.options.rows, count),
                columns: number = Math.min(this.options.columns, count);

            if ((columns > 0) && (rows > 0)) {
                this._totalColumns = columns;
                this._totalRows = rows;
            } else if (rows > 0) {
                this._totalRows = rows;
                this._totalColumns = Math.ceil(count / rows);
            } else if (columns > 0) {
                this._totalColumns = columns;
                this._totalRows = Math.ceil(count / columns);
            } else {
                this._totalColumns = TableView.defaultColumns;
                this._totalRows = Math.ceil(count / TableView.defaultColumns);
            }
        }

        private getGroupedData(): TableViewGroupedData {
            var options = this.options,
                groupedData: any[] = [],
                totalRows = options.rows,
                totalColumns = options.columns,
                totalItems: number = this._data.length,
                totalRows = options.rows > totalItems
                    ? totalItems
                    : options.rows,
                totalColumns = options.columns > totalItems
                    ? totalItems
                    : options.columns;

            if (totalColumns === 0 && totalRows === 0) {
                if (options.orientation === Orientation.HORIZONTAL) {
                    totalColumns = totalItems;
                    totalRows = 1;
                } else {
                    totalColumns = 1;
                    totalRows = totalItems;
                }
            } else if (totalColumns === 0 && totalRows > 0) {
                totalColumns = Math.ceil(totalItems / totalRows);
            } else if (totalColumns > 0 && totalRows === 0) {
                totalRows = Math.ceil(totalItems / totalColumns);
            }

            if (this.options.orientation === Orientation.VERTICAL) {
                var n = totalRows;

                totalRows = totalColumns;
                totalColumns = n;
            } else if (this.options.orientation === Orientation.HORIZONTAL) {
                if (totalRows === 0) {
                    totalRows = this._totalRows;
                }

                if (totalColumns === 0) {
                    totalColumns = this._totalColumns;
                }
            }

            var m: number = 0,
                k: number = 0;

            for (var i: number = 0; i < totalRows; i++) {
                if (this.options.orientation === Orientation.VERTICAL
                    && options.rows === 0
                    && totalItems % options.columns > 0
                    && options.columns <= totalItems) {
                    if (totalItems % options.columns > i) {
                        m = i * Math.ceil(totalItems / options.columns);
                        k = m + Math.ceil(totalItems / options.columns);

                        this.addDataToArray(groupedData, this._data, m, k);
                    } else {
                        this.addDataToArray(groupedData, this._data, k, k + Math.floor(totalItems / options.columns));

                        k = k + Math.floor(totalItems / options.columns);
                    }
                } else if (this.options.orientation === Orientation.HORIZONTAL
                    && options.columns === 0
                    && totalItems % options.rows > 0
                    && options.rows <= totalItems) {

                    if (totalItems % options.rows > i) {
                        m = i * Math.ceil(totalItems / options.rows);
                        k = m + Math.ceil(totalItems / options.rows);

                        this.addDataToArray(groupedData, this._data, m, k);
                    } else {
                        this.addDataToArray(groupedData, this._data, k, k + Math.floor(totalItems / options.rows));

                        k = k + Math.floor(totalItems / options.rows);
                    }
                } else {
                    var k: number = i * totalColumns;

                    this.addDataToArray(groupedData, this._data, k, k + totalColumns);
                }
            }

            this.computedOptions = this.getComputedOptions(groupedData, this.options.orientation);

            return {
                data: groupedData,
                totalColumns: totalColumns,
                totalRows: totalRows
            };
        }

        private addDataToArray(array: any[], data: any[], start: number, end: number): void {
            if (!array || !data) {
                return;
            }

            var elements: any[] = data.slice(start, end);

            if (elements && elements.length > 0) {
                array.push(elements);
            }
        }

        private getComputedOptions(data: any[], orientation: string): TableViewComputedOptions {
            var rows: number,
                columns: number = 0;

            rows = data
                ? data.length
                : 0;

            for (var i: number = 0; i < rows; i++) {
                var currentRow: any[] = data[i];

                if (currentRow && currentRow.length > columns) {
                    columns = currentRow.length;
                }
            }

            if (orientation === Orientation.HORIZONTAL) {
                return {
                    columns: columns,
                    rows: rows
                };
            } else {
                return {
                    columns: rows,
                    rows: columns
                };
            }
        }

        public render(): void {
            var options: TableViewViewOptions = this.options,
                visibleGroupContainer: D3.Selection = this.visibleGroupContainer,
                rowHeight: number = options.rowHeight || TableView.defaultRowHeight,
                groupedData: TableViewGroupedData = this.getGroupedData(),
                rowSelection: D3.UpdateSelection,
                cellSelection: D3.UpdateSelection;

            rowSelection = visibleGroupContainer
                .selectAll(TableView.RowSelector.selector)
                .data(<ChicletSlicerDataPoint[]>groupedData.data);

            rowSelection
                .enter()
                .append("div")
                .classed(TableView.RowSelector.class, true);

            cellSelection = rowSelection
                .selectAll(TableView.CellSelector.selector)
                .data((dataPoints: ChicletSlicerDataPoint[]) => {
                    return dataPoints;
                });

            cellSelection
                .enter()
                .append('div')
                .classed(TableView.CellSelector.class, true);

            cellSelection.call((selection: D3.Selection) => {
                options.enter(selection);
            });

            cellSelection.call((selection: D3.Selection) => {
                options.update(selection);
            });

            cellSelection.style({
                'height': (rowHeight > 0) ? rowHeight + 'px' : 'auto'
            });

            if (this.options.orientation === Orientation.VERTICAL) {
                var realColumnNumber: number = 0;

                for (var i: number = 0; i < groupedData.data.length; i++) {
                    if (groupedData.data[i].length !== 0)
                        realColumnNumber = i + 1;
                }

                cellSelection.style({ 'width': '100%' });

                rowSelection
                    .style({
                        'width': (options.columnWidth > 0)
                            ? options.columnWidth + 'px'
                            : (100 / realColumnNumber) + '%'
                    });
            }
            else {
                cellSelection.style({
                    'width': (options.columnWidth > 0)
                        ? options.columnWidth + 'px'
                        : (100 / groupedData.totalColumns) + '%'
                });

                rowSelection.style({ 'width': null });
            }

            cellSelection
                .exit()
                .remove();

            rowSelection
                .exit()
                .call(d => options.exit(d))
                .remove();
        }
    }

    // TODO: Generate these from above, defining twice just introduces potential for error
    export var chicletSlicerProps = {
        general: {
            orientation: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'orientation' },
            columns: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'columns' },
            rows: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'rows' },
            showDisabled: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'showDisabled' },
            multiselect: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'multiselect' },
            selection: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'selection' },
            selfFilterEnabled: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'selfFilterEnabled' },
        },
        header: {
            show: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'show' },
            title: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'title' },
            fontColor: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'fontColor' },
            background: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'background' },
            outline: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'outline' },
            textSize: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'textSize' },
            outlineColor: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'outlineColor' },
            outlineWeight: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'outlineWeight' }
        },
        rows: {
            fontColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'fontColor' },
            textSize: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'textSize' },
            height: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'height' },
            width: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'width' },
            background: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'background' },
            transparency: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'transparency' },
            selectedColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'selectedColor' },
            hoverColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'hoverColor' },
            unselectedColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'unselectedColor' },
            disabledColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'disabledColor' },
            outline: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'outline' },
            outlineColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'outlineColor' },
            outlineWeight: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'outlineWeight' },
            borderStyle: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'borderStyle' },
        },
        images: {
            imageSplit: <DataViewObjectPropertyIdentifier>{ objectName: 'images', propertyName: 'imageSplit' },
            stretchImage: <DataViewObjectPropertyIdentifier>{ objectName: 'images', propertyName: 'stretchImage' },
            bottomImage: <DataViewObjectPropertyIdentifier>{ objectName: 'images', propertyName: 'bottomImage' },
        },
        selectedPropertyIdentifier: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'selected' },
        filterPropertyIdentifier: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'filter' },
        formatString: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'formatString' },
        hasSavedSelection: true,
    };

    module ChicletBorderStyle {
        export var ROUNDED: string = 'Rounded';
        export var CUT: string = 'Cut';
        export var SQUARE: string = 'Square';

        export var type: IEnumType = createEnumType([
            { value: ROUNDED, displayName: ChicletBorderStyle.ROUNDED },
            { value: CUT, displayName: ChicletBorderStyle.CUT },
            { value: SQUARE, displayName: ChicletBorderStyle.SQUARE },
        ]);
    }

    module ChicletSlicerShowDisabled {
        export var INPLACE: string = 'Inplace';
        export var BOTTOM: string = 'Bottom';
        export var HIDE: string = 'Hide';

        export var type: IEnumType = createEnumType([
            { value: INPLACE, displayName: ChicletSlicerShowDisabled.INPLACE },
            { value: BOTTOM, displayName: ChicletSlicerShowDisabled.BOTTOM },
            { value: HIDE, displayName: ChicletSlicerShowDisabled.HIDE },
        ]);
    }

    module Orientation {
        export var HORIZONTAL: string = 'Horizontal';
        export var VERTICAL: string = 'Vertical';

        export var type: IEnumType = createEnumType([
            { value: HORIZONTAL, displayName: HORIZONTAL },
            { value: VERTICAL, displayName: VERTICAL }
        ]);
    }

    export interface ChicletSlicerConstructorOptions {
        behavior?: ChicletSlicerWebBehavior;
    }

    export interface ChicletSlicerData {
        categorySourceName: string;
        formatString: string;
        slicerDataPoints: ChicletSlicerDataPoint[];
        slicerSettings: ChicletSlicerSettings;
        hasSelectionOverride?: boolean;
    }

    export interface ChicletSlicerDataPoint extends SelectableDataPoint {
        category?: string;
        value?: number;
        mouseOver?: boolean;
        mouseOut?: boolean;
        isSelectAllDataPoint?: boolean;
        imageURL?: string;
        selectable?: boolean;
        filtered?: boolean;
    }

    export interface ChicletSlicerSettings {
        general: {
            orientation: string;
            columns: number;
            rows: number;
            multiselect: boolean;
            showDisabled: string;
            selection: string;
            selfFilterEnabled: boolean;
            getSavedSelection?: () => string[];
            setSavedSelection?: (filter: SemanticFilter, selectionIds: string[]) => void;
        };
        margin: IMargin;
        header: {
            borderBottomWidth: number;
            show: boolean;
            outline: string;
            fontColor: string;
            background?: string;
            textSize: number;
            outlineColor: string;
            outlineWeight: number;
            title: string;
        };
        headerText: {
            marginLeft: number;
            marginTop: number;
        };
        slicerText: {
            textSize: number;
            height: number;
            width: number;
            fontColor: string;
            selectedColor: string;
            hoverColor: string;
            unselectedColor: string;
            disabledColor: string;
            marginLeft: number;
            outline: string;
            background?: string;
            transparency: number;
            outlineColor: string;
            outlineWeight: number;
            borderStyle: string;
        };
        slicerItemContainer: {
            marginTop: number;
            marginLeft: number;
        };
        images: {
            imageSplit: number;
            stretchImage: boolean;
            bottomImage: boolean;
        };
    }

    export class ChicletSlicer implements IVisual {
        public static capabilities: VisualCapabilities = {
            dataRoles: [
                {
                    name: 'Category',
                    kind: VisualDataRoleKind.Grouping,
                    displayName: 'Category',
                },
                {
                    name: 'Values',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'Values',
                },
                {
                    name: 'Image',
                    kind: VisualDataRoleKind.Grouping,
                    displayName: 'Image',
                },
            ],
            objects: {
                general: {
                    displayName: 'General',
                    properties: {
                        selection: {
                            displayName: "Selection",
                            type: { text: true }
                        },
                        orientation: {
                            displayName: 'Orientation',
                            type: { enumeration: Orientation.type }
                        },
                        columns: {
                            displayName: 'Columns',
                            type: { numeric: true }
                        },
                        rows: {
                            displayName: 'Rows',
                            type: { numeric: true }
                        },
                        showDisabled: {
                            displayName: 'Show Disabled',
                            type: { enumeration: ChicletSlicerShowDisabled.type }
                        },
                        multiselect: {
                            displayName: 'Multiple selection',
                            type: { bool: true }
                        },
                        selected: {
                            type: { bool: true }
                        },
                        filter: {
                            type: { filter: {} }
                        },
                        selfFilter: {
                            type: { filter: { selfFilter: true } }
                        },
                        selfFilterEnabled: {
                            type: { operations: { searchEnabled: true } }
                        },
                        formatString: {
                            type: { formatting: { formatString: true } }
                        },
                    },
                },
                header: {
                    displayName: 'Header',
                    properties: {
                        show: {
                            displayName: 'Show',
                            type: { bool: true }
                        },
                        title: {
                            displayName: 'Title',
                            type: { text: true }
                        },
                        fontColor: {
                            displayName: 'Font color',
                            type: { fill: { solid: { color: true } } }
                        },
                        background: {
                            displayName: 'Background',
                            type: { fill: { solid: { color: true } } }
                        },
                        outline: {
                            displayName: 'Outline',
                            type: { formatting: { outline: true } }
                        },
                        textSize: {
                            displayName: 'Text Size',
                            type: { numeric: true }
                        },
                        outlineColor: {
                            displayName: 'Outline Color',
                            type: { fill: { solid: { color: true } } }
                        },
                        outlineWeight: {
                            displayName: 'Outline Weight',
                            type: { numeric: true }
                        }
                    }
                },
                rows: {
                    displayName: 'Chiclets',
                    properties: {
                        fontColor: {
                            displayName: 'Text color',
                            type: { fill: { solid: { color: true } } }
                        },
                        textSize: {
                            displayName: 'Text Size',
                            type: { numeric: true }
                        },
                        height: {
                            displayName: 'Height',
                            type: { numeric: true }
                        },
                        width: {
                            displayName: 'Width',
                            type: { numeric: true }
                        },
                        selectedColor: {
                            displayName: 'Selected Color',
                            type: { fill: { solid: { color: true } } }
                        },
                        hoverColor: {
                            displayName: 'Hover Color',
                            type: { fill: { solid: { color: true } } }
                        },
                        unselectedColor: {
                            displayName: 'Unselected Color',
                            type: { fill: { solid: { color: true } } }
                        },
                        disabledColor: {
                            displayName: 'Disabled Color',
                            type: { fill: { solid: { color: true } } }
                        },
                        background: {
                            displayName: 'Background',
                            type: { fill: { solid: { color: true } } }
                        },
                        transparency: {
                            displayName: "Transparency",
                            description: "Set transparency for background color",
                            type: { numeric: true }
                        },
                        outline: {
                            displayName: 'Outline',
                            type: { formatting: { outline: true } }
                        },
                        outlineColor: {
                            displayName: 'Outline Color',
                            type: { fill: { solid: { color: true } } }
                        },
                        outlineWeight: {
                            displayName: 'Outline Weight',
                            type: { numeric: true }
                        },
                        borderStyle: {
                            displayName: 'Outline Style',
                            type: { enumeration: ChicletBorderStyle.type }
                        },
                    }
                },
                images: {
                    displayName: 'Images',
                    properties: {
                        imageSplit: {
                            displayName: 'Image Split',
                            type: { numeric: true }
                        },
                        stretchImage: {
                            displayName: 'Stretch image',
                            type: { bool: true }
                        },
                        bottomImage: {
                            displayName: 'Bottom image',
                            type: { bool: true }
                        },
                    }
                },
            },
            dataViewMappings: [{
                conditions: [
                    {
                        'Category': { max: 1 },
                        'Image': { min: 0, max: 1 },
                        'Values': { min: 0, max: 1 }
                    }
                ],
                categorical: {
                    categories: {
                        for: { in: 'Category' },
                        dataReductionAlgorithm: { top: { count: 10000 } }
                    },
                    values: {
                        group: {
                            by: 'Image',
                            select: [{ bind: { to: 'Values' } }],
                            dataReductionAlgorithm: { top: { count: 10000 } }
                        }
                    },
                    includeEmptyGroups: true
                }
            }],
            supportsHighlight: true,
            sorting: {
                default: {},
            },
            suppressDefaultTitle: true,
        };

        private element: JQuery;
        private searchHeader: JQuery;
        private searchInput: JQuery;
        private currentViewport: IViewport;
        private dataView: DataView;
        private slicerHeader: D3.Selection;
        private slicerBody: D3.Selection;
        private tableView: ITableView;
        private slicerData: ChicletSlicerData;
        private settings: ChicletSlicerSettings;
        private interactivityService: IInteractivityService;
        private behavior: ChicletSlicerWebBehavior;
        private hostServices: IVisualHostServices;
        private waitingForData: boolean;
        private isSelectionLoaded: boolean;
        private isSelectionSaved: boolean;

        public static DefaultFontFamily: string = "'Segoe UI', 'wf_segoe-ui_normal', helvetica, arial, sans-serif";
        public static DefaultFontSizeInPt: number = 11;

        private static cellTotalInnerPaddings: number = 8;
        private static cellTotalInnerBorders: number = 2;
        private static chicletTotalInnerRightLeftPaddings: number = 14;

        public static MinImageSplit: number = 0;
        public static MaxImageSplit: number = 100;

        private static MinSizeOfViewport: number = 0;

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

        public static DefaultStyleProperties(): ChicletSlicerSettings {
            return {
                general: {
                    orientation: Orientation.VERTICAL,
                    columns: 3,
                    rows: 0,
                    multiselect: true,
                    showDisabled: ChicletSlicerShowDisabled.INPLACE,
                    selection: null,
                    selfFilterEnabled: false
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
                    marginLeft: 8,
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
                    marginLeft: 8,
                    outline: 'Frame',
                    background: null,
                    transparency: 0,
                    outlineColor: '#000000',
                    outlineWeight: 1,
                    borderStyle: 'Cut',

                },
                slicerItemContainer: {
                    // The margin is assigned in the less file. This is needed for the height calculations.
                    marginTop: 5,
                    marginLeft: 0,
                },
                images: {
                    imageSplit: 50,
                    stretchImage: false,
                    bottomImage: false
                }
            };
        }

        constructor(options?: ChicletSlicerConstructorOptions) {
            if (options) {
                if (options.behavior) {
                    this.behavior = options.behavior;
                }
            }

            if (!this.behavior) {
                this.behavior = new ChicletSlicerWebBehavior();
            }
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

        public static converter(dataView: DataView, searchText: string, interactivityService: IInteractivityService): ChicletSlicerData {
            if (!dataView ||
                !dataView.categorical ||
                !dataView.categorical.categories ||
                !dataView.categorical.categories[0] ||
                !dataView.categorical.categories[0].values ||
                !(dataView.categorical.categories[0].values.length > 0)) {
                return;
            }

            var converter = new ChicletSlicerChartConversion.ChicletSlicerConverter(dataView, interactivityService);

            converter.convert();

            var slicerData: ChicletSlicerData,
                defaultSettings: ChicletSlicerSettings = this.DefaultStyleProperties(),
                objects: DataViewObjects = dataView.metadata.objects;

            if (objects) {
                defaultSettings.general.orientation = DataViewObjects.getValue<string>(objects, chicletSlicerProps.general.orientation, defaultSettings.general.orientation);
                defaultSettings.general.columns = DataViewObjects.getValue<number>(objects, chicletSlicerProps.general.columns, defaultSettings.general.columns);
                defaultSettings.general.rows = DataViewObjects.getValue<number>(objects, chicletSlicerProps.general.rows, defaultSettings.general.rows);
                defaultSettings.general.multiselect = DataViewObjects.getValue<boolean>(objects, chicletSlicerProps.general.multiselect, defaultSettings.general.multiselect);
                defaultSettings.general.showDisabled = DataViewObjects.getValue<string>(objects, chicletSlicerProps.general.showDisabled, defaultSettings.general.showDisabled);
                defaultSettings.general.selection = DataViewObjects.getValue(dataView.metadata.objects, chicletSlicerProps.general.selection, defaultSettings.general.selection);
                defaultSettings.general.selfFilterEnabled = DataViewObjects.getValue<boolean>(objects, chicletSlicerProps.general.selfFilterEnabled, defaultSettings.general.selfFilterEnabled);

                defaultSettings.header.show = DataViewObjects.getValue<boolean>(objects, chicletSlicerProps.header.show, defaultSettings.header.show);
                defaultSettings.header.title = DataViewObjects.getValue<string>(objects, chicletSlicerProps.header.title, defaultSettings.header.title);
                defaultSettings.header.fontColor = DataViewObjects.getFillColor(objects, chicletSlicerProps.header.fontColor, defaultSettings.header.fontColor);
                defaultSettings.header.background = DataViewObjects.getFillColor(objects, chicletSlicerProps.header.background, defaultSettings.header.background);
                defaultSettings.header.textSize = DataViewObjects.getValue<number>(objects, chicletSlicerProps.header.textSize, defaultSettings.header.textSize);
                defaultSettings.header.outline = DataViewObjects.getValue<string>(objects, chicletSlicerProps.header.outline, defaultSettings.header.outline);
                defaultSettings.header.outlineColor = DataViewObjects.getFillColor(objects, chicletSlicerProps.header.outlineColor, defaultSettings.header.outlineColor);
                defaultSettings.header.outlineWeight = DataViewObjects.getValue<number>(objects, chicletSlicerProps.header.outlineWeight, defaultSettings.header.outlineWeight);

                defaultSettings.slicerText.textSize = DataViewObjects.getValue<number>(objects, chicletSlicerProps.rows.textSize, defaultSettings.slicerText.textSize);
                defaultSettings.slicerText.height = DataViewObjects.getValue<number>(objects, chicletSlicerProps.rows.height, defaultSettings.slicerText.height);
                defaultSettings.slicerText.width = DataViewObjects.getValue<number>(objects, chicletSlicerProps.rows.width, defaultSettings.slicerText.width);
                defaultSettings.slicerText.selectedColor = DataViewObjects.getFillColor(objects, chicletSlicerProps.rows.selectedColor, defaultSettings.slicerText.selectedColor);
                defaultSettings.slicerText.hoverColor = DataViewObjects.getFillColor(objects, chicletSlicerProps.rows.hoverColor, defaultSettings.slicerText.hoverColor);
                defaultSettings.slicerText.unselectedColor = DataViewObjects.getFillColor(objects, chicletSlicerProps.rows.unselectedColor, defaultSettings.slicerText.unselectedColor);
                defaultSettings.slicerText.disabledColor = DataViewObjects.getFillColor(objects, chicletSlicerProps.rows.disabledColor, defaultSettings.slicerText.disabledColor);
                defaultSettings.slicerText.background = DataViewObjects.getFillColor(objects, chicletSlicerProps.rows.background, defaultSettings.slicerText.background);
                defaultSettings.slicerText.transparency = DataViewObjects.getValue<number>(objects, chicletSlicerProps.rows.transparency, defaultSettings.slicerText.transparency);
                defaultSettings.slicerText.fontColor = DataViewObjects.getFillColor(objects, chicletSlicerProps.rows.fontColor, defaultSettings.slicerText.fontColor);
                defaultSettings.slicerText.outline = DataViewObjects.getValue<string>(objects, chicletSlicerProps.rows.outline, defaultSettings.slicerText.outline);
                defaultSettings.slicerText.outlineColor = DataViewObjects.getFillColor(objects, chicletSlicerProps.rows.outlineColor, defaultSettings.slicerText.outlineColor);
                defaultSettings.slicerText.outlineWeight = DataViewObjects.getValue<number>(objects, chicletSlicerProps.rows.outlineWeight, defaultSettings.slicerText.outlineWeight);
                defaultSettings.slicerText.borderStyle = DataViewObjects.getValue<string>(objects, chicletSlicerProps.rows.borderStyle, defaultSettings.slicerText.borderStyle);

                defaultSettings.images.imageSplit = DataViewObjects.getValue<number>(objects, chicletSlicerProps.images.imageSplit, defaultSettings.images.imageSplit);
                defaultSettings.images.stretchImage = DataViewObjects.getValue<boolean>(objects, chicletSlicerProps.images.stretchImage, defaultSettings.images.stretchImage);
                defaultSettings.images.bottomImage = DataViewObjects.getValue<boolean>(objects, chicletSlicerProps.images.bottomImage, defaultSettings.images.bottomImage);
            }

            if (defaultSettings.general.selfFilterEnabled && searchText) {
                searchText = searchText.toLowerCase();
                converter.dataPoints.forEach(x => x.filtered = x.category.toLowerCase().indexOf(searchText) < 0);
            }

            var categories: DataViewCategoricalColumn = dataView.categorical.categories[0];

            slicerData = {
                categorySourceName: categories.source.displayName,
                formatString: valueFormatter.getFormatString(categories.source, chicletSlicerProps.formatString),
                slicerSettings: defaultSettings,
                slicerDataPoints: converter.dataPoints,
            };

            // Override hasSelection if a objects contained more scopeIds than selections we found in the data
            slicerData.hasSelectionOverride = converter.hasSelectionOverride;

            return slicerData;
        }

        public init(options: VisualInitOptions): void {
            this.element = options.element;
            this.currentViewport = options.viewport;

            if (this.behavior) {
                this.interactivityService = createInteractivityService(options.host);
            }

            this.hostServices = options.host;
            this.hostServices.canSelect = ChicletSlicer.canSelect;

            this.settings = ChicletSlicer.DefaultStyleProperties();

            this.initContainer();
        }

        private static canSelect(args: SelectEventArgs): boolean {
            var selectors = _.map(args.visualObjects, (visualObject) => {
                return Selector.convertSelectorsByColumnToSelector(visualObject.selectorsByColumn);
            });

            // We can't have multiple selections if any include more than one identity
            if (selectors && (selectors.length > 1)) {
                if (selectors.some((value: Selector) => value && value.data && value.data.length > 1)) {
                    return false;
                }
            }

            // Todo: check for cases of trying to select a category and a series (not the intersection)
            return true;
        }

        public update(options: VisualUpdateOptions) {
            if (!options ||
                !options.dataViews ||
                !options.dataViews[0] ||
                !options.viewport) {
                return;
            }

            var existingDataView = this.dataView;
            this.dataView = options.dataViews[0];

            var resetScrollbarPosition: boolean = true;
            if (existingDataView) {
                resetScrollbarPosition = !DataViewAnalysis.hasSameCategoryIdentity(existingDataView, this.dataView);
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

        public onResizing(finalViewport: IViewport): void {
            this.currentViewport = finalViewport;
            this.updateInternal(false /* resetScrollbarPosition */);
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            var data: ChicletSlicerData = this.slicerData;

            if (!data) {
                return;
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
            }
        }

        private enumerateHeader(data: ChicletSlicerData): VisualObjectInstance[] {
            var slicerSettings: ChicletSlicerSettings = this.settings;

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
            var slicerSettings: ChicletSlicerSettings = this.settings;

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
                    borderStyle: slicerSettings.slicerText.borderStyle,
                }
            }];
        }

        private enumerateGeneral(data: ChicletSlicerData): VisualObjectInstance[] {
            var slicerSettings: ChicletSlicerSettings = this.settings;

            return [{
                selector: null,
                objectName: 'general',
                properties: {
                    orientation: slicerSettings.general.orientation,
                    columns: slicerSettings.general.columns,
                    rows: slicerSettings.general.rows,
                    showDisabled: slicerSettings.general.showDisabled,
                    multiselect: slicerSettings.general.multiselect,
                    selfFilterEnabled: slicerSettings.general.selfFilterEnabled
                }
            }];
        }

        private enumerateImages(data: ChicletSlicerData): VisualObjectInstance[] {
            var slicerSettings: ChicletSlicerSettings = this.settings;

            return [{
                selector: null,
                objectName: 'images',
                properties: {
                    imageSplit: slicerSettings.images.imageSplit,
                    stretchImage: slicerSettings.images.stretchImage,
                    bottomImage: slicerSettings.images.bottomImage,
                }
            }];
        }

        private updateInternal(resetScrollbarPosition: boolean) {
            var data = ChicletSlicer.converter(
                this.dataView,
                this.searchInput.val(),
                this.interactivityService);

            if (!data) {
                this.tableView.empty();

                return;
            }

            if (this.interactivityService) {
                this.interactivityService.applySelectionStateToData(data.slicerDataPoints);
            }

            data.slicerSettings.header.outlineWeight = data.slicerSettings.header.outlineWeight < 0
                ? 0
                : data.slicerSettings.header.outlineWeight;

            data.slicerSettings.slicerText.outlineWeight = data.slicerSettings.slicerText.outlineWeight < 0
                ? 0
                : data.slicerSettings.slicerText.outlineWeight;

            data.slicerSettings.slicerText.height = data.slicerSettings.slicerText.height < 0
                ? 0
                : data.slicerSettings.slicerText.height;

            data.slicerSettings.slicerText.width = data.slicerSettings.slicerText.width < 0
                ? 0
                : data.slicerSettings.slicerText.width;

            data.slicerSettings.images.imageSplit = ChicletSlicer.getValidImageSplit(data.slicerSettings.images.imageSplit);

            data.slicerSettings.general.columns = data.slicerSettings.general.columns < 0
                ? 0
                : data.slicerSettings.general.columns;

            data.slicerSettings.general.rows = data.slicerSettings.general.rows < 0
                ? 0
                : data.slicerSettings.general.rows;

            data.slicerSettings.general.getSavedSelection = () => {
                try {
                    return JSON.parse(this.slicerData.slicerSettings.general.selection) || [];
                } catch (ex) {
                    return [];
                }
            };

            data.slicerSettings.general.setSavedSelection = (filter: SemanticFilter, selectionIds: string[]): void => {
                this.isSelectionSaved = true;
                this.hostServices.persistProperties(<VisualObjectInstancesToPersist>{
                    merge: [{
                        objectName: "general",
                        selector: null,
                        properties: {
                            filter: filter,
                            selection: selectionIds && JSON.stringify(selectionIds) || ""
                        }
                    }]
                });
            };

            if (this.slicerData) {
                if (this.isSelectionSaved) {
                    this.isSelectionLoaded = true;
                } else {
                    this.isSelectionLoaded = this.slicerData.slicerSettings.general.selection === data.slicerSettings.general.selection;
                }
            } else {
                this.isSelectionLoaded = false;
            }

            this.slicerData = data;
            this.settings = this.slicerData.slicerSettings;

            this.updateSlicerBodyDimensions();

            if (this.settings.general.showDisabled === ChicletSlicerShowDisabled.BOTTOM) {
                data.slicerDataPoints.sort(function (a, b) {
                    if (a.selectable === b.selectable) {
                        return 0;
                    } else if (a.selectable && !b.selectable) {
                        return -1;
                    } else {
                        return 1;
                    }
                });
            } else if (this.settings.general.showDisabled === ChicletSlicerShowDisabled.HIDE) {
                data.slicerDataPoints = data.slicerDataPoints.filter(x => x.selectable);
            }

            var height: number = this.settings.slicerText.height;

            if (height === 0) {
                var extraSpaceForCell = ChicletSlicer.cellTotalInnerPaddings + ChicletSlicer.cellTotalInnerBorders,
                    textProperties = ChicletSlicer.getChicletTextProperties(this.settings.slicerText.textSize);

                height = TextMeasurementService.estimateSvgTextHeight(textProperties) +
                    TextMeasurementService.estimateSvgTextBaselineDelta(textProperties) +
                    extraSpaceForCell;

                var hasImage: boolean = _.any(data.slicerDataPoints, (dataPoint: ChicletSlicerDataPoint) => {
                    return dataPoint.imageURL !== '' && typeof dataPoint.imageURL !== "undefined";
                });

                if (hasImage) {
                    height += 100;
                }
            }

            this.tableView
                .rowHeight(height)
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

            this.updateSearchHeader();
        }

        private initContainer() {
            var settings: ChicletSlicerSettings = this.settings,
                slicerBodyViewport: IViewport = this.getSlicerBodyViewport(this.currentViewport);

            var slicerContainer: D3.Selection = d3.select(this.element.get(0))
                .append('div')
                .classed(ChicletSlicer.ContainerSelector.class, true);

            this.slicerHeader = slicerContainer
                .append('div')
                .classed(ChicletSlicer.HeaderSelector.class, true);

            this.slicerHeader
                .append('span')
                .classed(ChicletSlicer.ClearSelector.class, true)
                .attr('title', 'Clear');

            this.slicerHeader
                .append('div')
                .classed(ChicletSlicer.HeaderTextSelector.class, true)
                .style({
                    'margin-left': PixelConverter.toString(settings.headerText.marginLeft),
                    'margin-top': PixelConverter.toString(settings.headerText.marginTop),
                    'border-style': this.getBorderStyle(settings.header.outline),
                    'border-color': settings.header.outlineColor,
                    'border-width': this.getBorderWidth(settings.header.outline, settings.header.outlineWeight),
                    'font-size': PixelConverter.fromPoint(settings.header.textSize),
                });

            this.createSearchHeader($(slicerContainer.node()));

            this.slicerBody = slicerContainer
                .append('div')
                .classed(ChicletSlicer.BodySelector.class, true)
                .classed(
                    ChicletSlicer.SlicerBodyHorizontalSelector.class,
                    settings.general.orientation === Orientation.HORIZONTAL)
                .classed(
                    ChicletSlicer.SlicerBodyVerticalSelector.class,
                    settings.general.orientation === Orientation.VERTICAL
                )
                .style({
                    'height': PixelConverter.toString(slicerBodyViewport.height),
                    'width': '100%',
                });

            var rowEnter = (rowSelection: D3.Selection) => {
                this.enterSelection(rowSelection);
            };

            var rowUpdate = (rowSelection: D3.Selection) => {
                this.updateSelection(rowSelection);
            };

            var rowExit = (rowSelection: D3.Selection) => {
                rowSelection.remove();
            };

            var tableViewOptions: TableViewViewOptions = {
                rowHeight: this.getRowHeight(),
                columnWidth: this.settings.slicerText.width,
                orientation: this.settings.general.orientation,
                rows: this.settings.general.rows,
                columns: this.settings.general.columns,
                enter: rowEnter,
                exit: rowExit,
                update: rowUpdate,
                loadMoreData: () => this.onLoadMoreData(),
                scrollEnabled: true,
                viewport: this.getSlicerBodyViewport(this.currentViewport),
                baseContainer: this.slicerBody,
            };

            this.tableView = TableViewFactory.createTableView(tableViewOptions);
        }

        private enterSelection (rowSelection: D3.Selection): void {
            var settings: ChicletSlicerSettings = this.settings;

            var ulItemElement = rowSelection
                .selectAll('ul')
                .data((dataPoint: ChicletSlicerDataPoint) => {
                    return [dataPoint];
                });

            ulItemElement
                .enter()
                .append('ul');

            ulItemElement
                .exit()
                .remove();

            var listItemElement = ulItemElement
                .selectAll(ChicletSlicer.ItemContainerSelector.selector)
                .data((dataPoint: ChicletSlicerDataPoint) => {
                    return [dataPoint];
                });

            listItemElement
                .enter()
                .append('li')
                .classed(ChicletSlicer.ItemContainerSelector.class, true);

            listItemElement.style({
                'margin-left': PixelConverter.toString(settings.slicerItemContainer.marginLeft)
            });

            var slicerImgWrapperSelection: D3.UpdateSelection = listItemElement
                .selectAll(ChicletSlicer.SlicerImgWrapperSelector.selector)
                .data((dataPoint: ChicletSlicerDataPoint) => {
                    return [dataPoint];
                });

            slicerImgWrapperSelection
                .enter()
                .append('img')
                .classed(ChicletSlicer.SlicerImgWrapperSelector.class, true);

            slicerImgWrapperSelection
                .exit()
                .remove();

            var slicerTextWrapperSelection: D3.UpdateSelection = listItemElement
                .selectAll(ChicletSlicer.SlicerTextWrapperSelector.selector)
                .data((dataPoint: ChicletSlicerDataPoint) => {
                    return [dataPoint];
                });

            slicerTextWrapperSelection
                .enter()
                .append('div')
                .classed(ChicletSlicer.SlicerTextWrapperSelector.class, true);

            var labelTextSelection: D3.UpdateSelection = slicerTextWrapperSelection
                .selectAll(ChicletSlicer.LabelTextSelector.selector)
                .data((dataPoint: ChicletSlicerDataPoint) => {
                    return [dataPoint];
                });

            labelTextSelection
                .enter()
                .append('span')
                .classed(ChicletSlicer.LabelTextSelector.class, true);

            labelTextSelection.style({
                'font-size': PixelConverter.fromPoint(settings.slicerText.textSize),
            });

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

        private updateSelection(rowSelection: D3.Selection): void {
            var settings: ChicletSlicerSettings = this.settings,
                data: ChicletSlicerData = this.slicerData;

            if (data && settings) {
                this.slicerHeader
                    .classed('hidden', !settings.header.show);

                this.slicerHeader
                    .select(ChicletSlicer.HeaderTextSelector.selector)
                    .text(settings.header.title.trim() !== ""
                        ? settings.header.title.trim()
                        : this.slicerData.categorySourceName)
                    .style({
                        'border-style': this.getBorderStyle(settings.header.outline),
                        'border-color': settings.header.outlineColor,
                        'border-width': this.getBorderWidth(settings.header.outline, settings.header.outlineWeight),
                        'color': settings.header.fontColor,
                        'background-color': settings.header.background,
                        'font-size': PixelConverter.fromPoint(settings.header.textSize),
                    });

                this.slicerBody
                    .classed(
                        ChicletSlicer.SlicerBodyHorizontalSelector.class,
                        settings.general.orientation === Orientation.HORIZONTAL)
                    .classed(
                        ChicletSlicer.SlicerBodyVerticalSelector.class,
                        settings.general.orientation === Orientation.VERTICAL);

                var slicerText: D3.Selection = rowSelection.selectAll(ChicletSlicer.LabelTextSelector.selector),
                    textProperties: TextProperties = ChicletSlicer.getChicletTextProperties(settings.slicerText.textSize),
                    formatString: string = data.formatString;

                slicerText.text((d: ChicletSlicerDataPoint) => {
                    var maxWidth: number = 0;

                    textProperties.text = valueFormatter.format(d.category, formatString);

                    if (this.settings.slicerText.width === 0) {
                        var slicerBodyViewport: IViewport = this.getSlicerBodyViewport(this.currentViewport);

                        maxWidth = (slicerBodyViewport.width / (this.tableView.computedColumns || 1)) -
                            ChicletSlicer.chicletTotalInnerRightLeftPaddings -
                            ChicletSlicer.cellTotalInnerBorders -
                            settings.slicerText.outlineWeight;

                        return TextMeasurementService.getTailoredTextOrDefault(textProperties, maxWidth);
                    }
                    else {
                        maxWidth = this.settings.slicerText.width -
                            ChicletSlicer.chicletTotalInnerRightLeftPaddings -
                            ChicletSlicer.cellTotalInnerBorders -
                            settings.slicerText.outlineWeight;

                        return TextMeasurementService.getTailoredTextOrDefault(textProperties, maxWidth);
                    }
                });

                rowSelection
                    .selectAll(ChicletSlicer.SlicerImgWrapperSelector.selector)
                    .style({
                        'max-height': settings.images.imageSplit + '%',
                        'display': (dataPoint: ChicletSlicerDataPoint) => (dataPoint.imageURL)
                            ? 'flex'
                            : 'none'
                    })
                    .classed({
                        'hidden': (dataPoint: ChicletSlicerDataPoint) => {
                            if (!(dataPoint.imageURL)) {
                                return true;
                            }

                            if (settings.images.imageSplit < 10) {
                                return true;
                            }
                        },
                        'stretchImage': settings.images.stretchImage,
                        'bottomImage': settings.images.bottomImage
                    })
                    .attr('src', (d: ChicletSlicerDataPoint) => {
                        return d.imageURL ? d.imageURL : '';
                    });

                rowSelection.selectAll('.slicer-text-wrapper')
                    .style('height', (d: ChicletSlicerDataPoint) => {
                        return d.imageURL
                            ? (100 - settings.images.imageSplit) + '%'
                            : '100%';
                    })
                    .classed('hidden', (d: ChicletSlicerDataPoint) => {
                        if (settings.images.imageSplit > 90) {
                            return true;
                        }
                    });

                rowSelection.selectAll('.slicerItemContainer').style({
                    'color': settings.slicerText.fontColor,
                    'border-style': this.getBorderStyle(settings.slicerText.outline),
                    'border-color': settings.slicerText.outlineColor,
                    'border-width': this.getBorderWidth(settings.slicerText.outline, settings.slicerText.outlineWeight),
                    'font-size': PixelConverter.fromPoint(settings.slicerText.textSize),
                    'border-radius': this.getBorderRadius(settings.slicerText.borderStyle),
                });

                if (settings.slicerText.background) {
                    var backgroundColor: string = explore.util.hexToRGBString(
                        settings.slicerText.background,
                        (100 - settings.slicerText.transparency) / 100);

                    this.slicerBody.style('background-color', backgroundColor);
                }
                else {
                    this.slicerBody.style('background-color', null);
                }

                if (this.interactivityService && this.slicerBody) {
                    this.interactivityService.applySelectionStateToData(data.slicerDataPoints);

                    var slicerBody: D3.Selection = this.slicerBody.attr('width', this.currentViewport.width),
                        slicerItemContainers: D3.Selection = slicerBody.selectAll(ChicletSlicer.ItemContainerSelector.selector),
                        slicerItemLabels: D3.Selection = slicerBody.selectAll(ChicletSlicer.LabelTextSelector.selector),
                        slicerItemInputs: D3.Selection = slicerBody.selectAll(ChicletSlicer.InputSelector.selector),
                        slicerClear: D3.Selection = this.slicerHeader.select(ChicletSlicer.ClearSelector.selector);

                    var behaviorOptions: ChicletSlicerBehaviorOptions = {
                        dataPoints: data.slicerDataPoints,
                        slicerItemContainers: slicerItemContainers,
                        slicerItemLabels: slicerItemLabels,
                        slicerItemInputs: slicerItemInputs,
                        slicerClear: slicerClear,
                        interactivityService: this.interactivityService,
                        slicerSettings: data.slicerSettings,
                        isSelectionLoaded: this.isSelectionLoaded
                    };

                    this.interactivityService.bind(data.slicerDataPoints, this.behavior, behaviorOptions, {
                        overrideSelectionFromData: true,
                        hasSelectionOverride: data.hasSelectionOverride,
                    });

                    this.behavior.styleSlicerInputs(
                        rowSelection.select(ChicletSlicer.ItemContainerSelector.selector),
                        this.interactivityService.hasSelection());
                }
                else {
                    this.behavior.styleSlicerInputs(rowSelection.select(ChicletSlicer.ItemContainerSelector.selector), false);
                }
            }
        };

        private createSearchHeader(container: JQuery): void {
            this.searchHeader = $("<div>")
                .appendTo(container)
                .addClass("searchHeader")
                .addClass("collapsed");

            $("<div>").appendTo(this.searchHeader)
                .attr("title", "Search")
                .addClass("search");

            var counter = 0;
            this.searchInput = $("<input>").appendTo(this.searchHeader)
                .attr("type", "text")
                .attr("drag-resize-disabled", "true")
                .addClass("searchInput")
                .on("input", () => this.hostServices.persistProperties(<VisualObjectInstancesToPersist>{
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
            this.searchHeader.toggleClass("show", this.slicerData.slicerSettings.general.selfFilterEnabled);
            this.searchHeader.toggleClass("collapsed", !this.slicerData.slicerSettings.general.selfFilterEnabled);
        }

        private onLoadMoreData(): void {
            if (!this.waitingForData && this.dataView.metadata && this.dataView.metadata.segment) {
                this.hostServices.loadMoreData();
                this.waitingForData = true;
            }
        }

        private getSlicerBodyViewport(currentViewport: IViewport): IViewport {
            var settings: ChicletSlicerSettings = this.settings,
                headerHeight: number = (settings.header.show) ? this.getHeaderHeight() : 0,
                borderHeight: number = settings.header.outlineWeight,
                height: number = currentViewport.height - (headerHeight + borderHeight + settings.header.borderBottomWidth),
                width: number = currentViewport.width - ChicletSlicer.WidthOfScrollbar;

            return {
                height: Math.max(height, ChicletSlicer.MinSizeOfViewport),
                width: Math.max(width, ChicletSlicer.MinSizeOfViewport)
            };
        }

        private updateSlicerBodyDimensions(): void {
            var slicerViewport: IViewport = this.getSlicerBodyViewport(this.currentViewport);
            this.slicerBody
                .style({
                    'height': PixelConverter.toString(slicerViewport.height),
                    'width': '100%',
                });
        }

        public static getChicletTextProperties(textSize?: number): TextProperties {
            return <TextProperties>{
                fontFamily: ChicletSlicer.DefaultFontFamily,
                fontSize: PixelConverter.fromPoint(textSize || ChicletSlicer.DefaultFontSizeInPt),
            };
        }

        private getHeaderHeight(): number {
            return TextMeasurementService.estimateSvgTextHeight(
                ChicletSlicer.getChicletTextProperties(this.settings.header.textSize));
        }

        private getRowHeight(): number {
            var textSettings = this.settings.slicerText;
            return textSettings.height !== 0
                ? textSettings.height
                : TextMeasurementService.estimateSvgTextHeight(ChicletSlicer.getChicletTextProperties(textSettings.textSize));
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

    module ChicletSlicerChartConversion {
        export class ChicletSlicerConverter {
            private dataViewCategorical: DataViewCategorical;
            private dataViewMetadata: DataViewMetadata;
            private category: DataViewCategoryColumn;
            private categoryIdentities: DataViewScopeIdentity[];
            private categoryValues: any[];
            private categoryColumnRef: SQExpr[];
            private categoryFormatString: string;
            private interactivityService: IInteractivityService;

            public numberOfCategoriesSelectedInData: number;
            public dataPoints: ChicletSlicerDataPoint[];
            public hasSelectionOverride: boolean;

            public constructor(dataView: DataView, interactivityService: IInteractivityService) {

                var dataViewCategorical = dataView.categorical;
                this.dataViewCategorical = dataViewCategorical;
                this.dataViewMetadata = dataView.metadata;

                if (dataViewCategorical.categories && dataViewCategorical.categories.length > 0) {
                    this.category = dataViewCategorical.categories[0];
                    this.categoryIdentities = this.category.identity;
                    this.categoryValues = this.category.values;
                    this.categoryColumnRef = <SQExpr[]>this.category.identityFields;
                    this.categoryFormatString = valueFormatter.getFormatString(this.category.source, chicletSlicerProps.formatString);
                }

                this.dataPoints = [];

                this.interactivityService = interactivityService;
                this.hasSelectionOverride = false;
            }

            public convert(): void {
                this.dataPoints = [];
                this.numberOfCategoriesSelectedInData = 0;
                // If category exists, we render labels using category values. If not, we render labels
                // using measure labels.
                if (this.categoryValues) {
                    var objects = this.dataViewMetadata ? <any>this.dataViewMetadata.objects : undefined;

                    var isInvertedSelectionMode = undefined;
                    var numberOfScopeIds: number;
                    if (objects && objects.general && objects.general.filter) {
                        if (!this.categoryColumnRef)
                            return;
                        var filter = <SemanticFilter>objects.general.filter;
                        var scopeIds = SQExprConverter.asScopeIdsContainer(filter, this.categoryColumnRef);
                        if (scopeIds) {
                            isInvertedSelectionMode = scopeIds.isNot;
                            numberOfScopeIds = scopeIds.scopeIds ? scopeIds.scopeIds.length : 0;
                        }
                        else {
                            isInvertedSelectionMode = false;
                        }
                    }

                    if (this.interactivityService) {
                        if (isInvertedSelectionMode === undefined) {
                            // The selection state is read from the Interactivity service in case of SelectAll or Clear when query doesn't update the visual
                            isInvertedSelectionMode = this.interactivityService.isSelectionModeInverted();
                        }
                        else {
                            this.interactivityService.setSelectionModeInverted(isInvertedSelectionMode);
                        }
                    }

                    var hasSelection: boolean = undefined;

                    for (var idx = 0; idx < this.categoryValues.length; idx++) {
                        var selected = isCategoryColumnSelected(chicletSlicerProps.selectedPropertyIdentifier, this.category, idx);
                        if (selected != null) {
                            hasSelection = selected;
                            break;
                        }
                    }

                    var dataViewCategorical = this.dataViewCategorical;
                    var formatStringProp = chicletSlicerProps.formatString;
                    var value: number = -Infinity;
                    var imageURL: string = '';

                    for (var categoryIndex: number = 0, categoryCount = this.categoryValues.length; categoryIndex < categoryCount; categoryIndex++) {
                        //var categoryIdentity = this.category.identity ? this.category.identity[categoryIndex] : null;
                        var categoryIsSelected = isCategoryColumnSelected(chicletSlicerProps.selectedPropertyIdentifier, this.category, categoryIndex);
                        var selectable: boolean = true;

                        if (hasSelection != null) {
                            if (isInvertedSelectionMode) {
                                if (this.category.objects == null)
                                    categoryIsSelected = undefined;

                                if (categoryIsSelected != null) {
                                    categoryIsSelected = hasSelection;
                                }
                                else if (categoryIsSelected == null)
                                    categoryIsSelected = !hasSelection;
                            }
                            else {
                                if (categoryIsSelected == null) {
                                    categoryIsSelected = !hasSelection;
                                }
                            }
                        }

                        if (categoryIsSelected) {
                            this.numberOfCategoriesSelectedInData++;
                        }

                        var categoryValue = this.categoryValues[categoryIndex];
                        var categoryLabel = valueFormatter.format(categoryValue, this.categoryFormatString);

                        if (this.dataViewCategorical.values) {

                            // Series are either measures in the multi-measure case, or the single series otherwise
                            for (var seriesIndex: number = 0; seriesIndex < this.dataViewCategorical.values.length; seriesIndex++) {
                                var seriesData = dataViewCategorical.values[seriesIndex];
                                if (seriesData.values[categoryIndex] != null) {
                                    value = <number>seriesData.values[categoryIndex];
                                    if (seriesData.highlights) {
                                        selectable = !(seriesData.highlights[categoryIndex] === null);
                                    }
                                    if (seriesData.source.groupName && seriesData.source.groupName !== '') {
                                        imageURL = converterHelper.getFormattedLegendLabel(seriesData.source, dataViewCategorical.values, formatStringProp);
                                        if (!/^(ftp|http|https):\/\/[^ "]+$/.test(imageURL)) {
                                            imageURL = undefined;
                                        }
                                    }
                                }
                            }
                        }
                        var categorySelectionId: SelectionId = SelectionIdBuilder.builder().withCategory(this.category, categoryIndex).createSelectionId();
                        this.dataPoints.push({
                            identity: categorySelectionId,
                            category: categoryLabel,
                            imageURL: imageURL,
                            value: value,
                            selected: categoryIsSelected,
                            selectable: selectable
                        });
                    }
                    if (numberOfScopeIds != null && numberOfScopeIds > this.numberOfCategoriesSelectedInData) {
                        this.hasSelectionOverride = true;
                    }
                }
            }
        }
    }

    //TODO: This module should be removed once TextMeasruementService exports the "estimateSvgTextBaselineDelta" function.
    export module ChicletSlicerTextMeasurementHelper {
        interface CanvasContext {
            font: string;
            measureText(text: string): { width: number };
        }

        interface CanvasElement extends HTMLElement {
            getContext(name: string);
        }

        var spanElement: JQuery;
        var svgTextElement: D3.Selection;
        var canvasCtx: CanvasContext;

        export function estimateSvgTextBaselineDelta(textProperties: TextProperties): number {
            var rect = estimateSvgTextRect(textProperties);
            return rect.y + rect.height;
        }

        function ensureDOM(): void {
            if (spanElement)
                return;

            spanElement = $('<span/>');
            $('body').append(spanElement);
            //The style hides the svg element from the canvas, preventing canvas from scrolling down to show svg black square.
            svgTextElement = d3.select($('body').get(0))
                .append('svg')
                .style({
                    'height': '0px',
                    'width': '0px',
                    'position': 'absolute'
                })
                .append('text');
            canvasCtx = (<CanvasElement>$('<canvas/>').get(0)).getContext("2d");
        }

        function measureSvgTextRect(textProperties: TextProperties): SVGRect {
            debug.assertValue(textProperties, 'textProperties');

            ensureDOM();

            svgTextElement.style(null);
            svgTextElement
                .text(textProperties.text)
                .attr({
                    'visibility': 'hidden',
                    'font-family': textProperties.fontFamily,
                    'font-size': textProperties.fontSize,
                    'font-weight': textProperties.fontWeight,
                    'font-style': textProperties.fontStyle,
                    'white-space': textProperties.whiteSpace || 'nowrap'
                });

            // We're expecting the browser to give a synchronous measurement here
            // We're using SVGTextElement because it works across all browsers
            return svgTextElement.node<SVGTextElement>().getBBox();
        }

        function estimateSvgTextRect(textProperties: TextProperties): SVGRect {
            //debug.assertValue(textProperties, 'textProperties');

            var estimatedTextProperties: TextProperties = {
                fontFamily: textProperties.fontFamily,
                fontSize: textProperties.fontSize,
                text: "M",
            };

            var rect = measureSvgTextRect(estimatedTextProperties);

            return rect;
        }
    }

    export interface ChicletSlicerBehaviorOptions {
        slicerItemContainers: D3.Selection;
        slicerItemLabels: D3.Selection;
        slicerItemInputs: D3.Selection;
        slicerClear: D3.Selection;
        dataPoints: ChicletSlicerDataPoint[];
        interactivityService: IInteractivityService;
        slicerSettings: ChicletSlicerSettings;
        isSelectionLoaded: boolean;
    }

    export class ChicletSlicerWebBehavior implements IInteractiveBehavior {
        private slicers: D3.Selection;
        private slicerItemLabels: D3.Selection;
        private slicerItemInputs: D3.Selection;
        private dataPoints: ChicletSlicerDataPoint[];
        private interactivityService: IInteractivityService;
        private slicerSettings: ChicletSlicerSettings;
        private options: ChicletSlicerBehaviorOptions;

        public bindEvents(options: ChicletSlicerBehaviorOptions, selectionHandler: ISelectionHandler): void {
            var slicers = this.slicers = options.slicerItemContainers;

            this.slicerItemLabels = options.slicerItemLabels;
            this.slicerItemInputs = options.slicerItemInputs;

            var slicerClear = options.slicerClear;

            this.dataPoints = options.dataPoints;
            this.interactivityService = options.interactivityService;
            this.slicerSettings = options.slicerSettings;
            this.options = options;

            if (!this.options.isSelectionLoaded) {
                this.loadSelection(selectionHandler);
            }

            slicers.on("mouseover", (d: ChicletSlicerDataPoint) => {
                if (d.selectable) {
                    d.mouseOver = true;
                    d.mouseOut = false;

                    this.renderMouseover();
                }
            });

            slicers.on("mouseout", (d: ChicletSlicerDataPoint) => {
                if (d.selectable) {
                    d.mouseOver = false;
                    d.mouseOut = true;

                    this.renderMouseover();
                }
            });

            slicers.on("click", (dataPoint: ChicletSlicerDataPoint, index) => {
                if (!dataPoint.selectable) {
                    return;
                }

                d3.event.preventDefault();

                var settings: ChicletSlicerSettings = this.slicerSettings;

                if (d3.event.altKey && settings.general.multiselect) {
                    var selectedIndexes = jQuery.map(this.dataPoints, (d, index) => {
                        if (d.selected) {
                            return index;
                        };
                    });

                    var selIndex = selectedIndexes.length > 0
                        ? (selectedIndexes[selectedIndexes.length - 1])
                        : 0;

                    if (selIndex > index) {
                        var temp = index;
                        index = selIndex;
                        selIndex = temp;
                    }

                    selectionHandler.handleClearSelection();

                    for (var i = selIndex; i <= index; i++) {
                        selectionHandler.handleSelection(this.dataPoints[i], true /* isMultiSelect */);
                    }
                }
                else if ((d3.event.ctrlKey || d3.event.metaKey) && settings.general.multiselect) {
                    selectionHandler.handleSelection(dataPoint, true /* isMultiSelect */);
                }
                else {
                    selectionHandler.handleSelection(dataPoint, false /* isMultiSelect */);
                }

                this.saveSelection(selectionHandler);
            });

            slicerClear.on("click", (d: SelectableDataPoint) => {
                selectionHandler.handleClearSelection();
                this.saveSelection(selectionHandler);
            });
        }

        public loadSelection(selectionHandler: ISelectionHandler): void {
            selectionHandler.handleClearSelection();
            var savedSelectionIds = this.slicerSettings.general.getSavedSelection();
            if (savedSelectionIds.length) {
                var selectedDataPoints = this.dataPoints.filter(d => savedSelectionIds.some(x => d.identity.getKey() === x));
                selectedDataPoints.forEach(x => selectionHandler.handleSelection(x, true));
                selectionHandler.persistSelectionFilter(chicletSlicerProps.filterPropertyIdentifier);
            }
        }

        private static getFilterFromSelectors(selectionHandler: ISelectionHandler, isSelectionModeInverted: boolean): SemanticFilter {
            var selectors: Selector[] = [];
            var selectedIds: SelectionId[] = <SelectionId[]>(<any>selectionHandler).selectedIds;

            if (selectedIds.length > 0) {
                selectors = _.chain(selectedIds)
                    .filter((value: SelectionId) => value.hasIdentity())
                    .map((value: SelectionId) => value.getSelector())
                    .value();
            }

            var filter: SemanticFilter = Selector.filterFromSelector(selectors, isSelectionModeInverted);
            return filter;
        }

        public saveSelection(selectionHandler: ISelectionHandler): void {
            var filter: SemanticFilter = ChicletSlicerWebBehavior.getFilterFromSelectors(selectionHandler, this.interactivityService.isSelectionModeInverted());
            var selectionIdKeys = (<SelectionId[]>(<any>selectionHandler).selectedIds).map(x => x.getKey());
            this.slicerSettings.general.setSavedSelection(filter, selectionIdKeys);
        }

        public renderSelection(hasSelection: boolean): void {
            if (!hasSelection && !this.interactivityService.isSelectionModeInverted()) {
                this.slicers.style('background', this.slicerSettings.slicerText.unselectedColor);
            }
            else {
                this.styleSlicerInputs(this.slicers, hasSelection);
            }
        }

        private renderMouseover(): void {
            this.slicerItemLabels.style({
                'color': (d: ChicletSlicerDataPoint) => {
                    if (d.mouseOver)
                        return this.slicerSettings.slicerText.hoverColor;

                    if (d.mouseOut) {
                        if (d.selected)
                            return this.slicerSettings.slicerText.fontColor;
                        else
                            return this.slicerSettings.slicerText.fontColor;
                    }
                }
            });
        }

        public styleSlicerInputs(slicers: D3.Selection, hasSelection: boolean) {
            var settings = this.slicerSettings;
            var selectedItems = [];
            slicers.each(function (d: ChicletSlicerDataPoint) {
                // get selected items
                if (d.selectable && d.selected) {
                    selectedItems.push(d);
                }

                d3.select(this).style({
                    'background': d.selectable ? (d.selected ? settings.slicerText.selectedColor : settings.slicerText.unselectedColor)
                        : settings.slicerText.disabledColor
                });

                d3.select(this).classed('slicerItem-disabled', !d.selectable);
            });
        }
    }

    module explore.util {
        export function hexToRGBString(hex: string, transparency?: number): string {

            // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
            var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
            hex = hex.replace(shorthandRegex, function (m, r, g, b) {
                return r + r + g + g + b + b;
            });

            // Hex format which return the format r-g-b
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

            var rgb = result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;

            // Wrong input
            if (rgb === null) {
                return '';
            }

            if (!transparency && transparency !== 0) {
                return "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")";
            }
            else {
                return "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + transparency + ")";
            }
        }
    }
}
