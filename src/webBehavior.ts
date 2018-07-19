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
    // d3
    import Selection = d3.Selection;
    import UpdateSelection = d3.selection.Update;

    // powerbi.data
    import ISQExpr = powerbi.data.ISQExpr;
    import Selector = powerbi.data.Selector;
    import ISemanticFilter = data.ISemanticFilter;

    // powerbi.extensibility.utils.interactivity
    import ISelectionHandler = powerbi.extensibility.utils.interactivity.ISelectionHandler;
    import SelectableDataPoint = powerbi.extensibility.utils.interactivity.SelectableDataPoint;
    import IInteractiveBehavior = powerbi.extensibility.utils.interactivity.IInteractiveBehavior;
    import IInteractivityService = powerbi.extensibility.utils.interactivity.IInteractivityService;

    export interface ChicletSlicerBehaviorOptions {
        slicerItemContainers: Selection<SelectableDataPoint>;
        slicerItemLabels: Selection<any>;
        slicerItemInputs: Selection<any>;
        slicerClear: Selection<any>;
        dataPoints: ChicletSlicerDataPoint[];
        interactivityService: IInteractivityService;
        slicerSettings: ChicletSlicerSettings;
        identityFields: ISQExpr[];
        isHighContrastMode: boolean;
    }

    export class ChicletSlicerWebBehavior implements IInteractiveBehavior {
        private slicers: Selection<SelectableDataPoint>;
        private slicerItemLabels: Selection<any>;
        private slicerItemInputs: Selection<any>;
        private interactivityService: IInteractivityService;
        private slicerSettings: ChicletSlicerSettings;
        private options: ChicletSlicerBehaviorOptions;
        private selectionHandler: ISelectionHandler;

        /**
         * Public for testability.
         */
        public dataPoints: ChicletSlicerDataPoint[];

        public bindEvents(options: ChicletSlicerBehaviorOptions, selectionHandler: ISelectionHandler): void {
            const slicers: Selection<SelectableDataPoint> = this.slicers = options.slicerItemContainers,
                slicerClear: Selection<any> = options.slicerClear;

            this.slicerItemLabels = options.slicerItemLabels;
            this.slicerItemInputs = options.slicerItemInputs;
            this.dataPoints = options.dataPoints;
            this.interactivityService = options.interactivityService;
            this.slicerSettings = options.slicerSettings;
            this.options = options;

            this.selectionHandler = selectionHandler;

            this.loadSelection();

            slicers.on("mouseover", (dataPoint: ChicletSlicerDataPoint) => {
                if (dataPoint.selectable) {
                    dataPoint.mouseOver = true;
                    dataPoint.mouseOut = false;

                    this.renderMouseover();
                }
            });

            slicers.on("mouseout", (dataPoint: ChicletSlicerDataPoint) => {
                if (dataPoint.selectable) {
                    dataPoint.mouseOver = false;
                    dataPoint.mouseOut = true;

                    this.renderMouseover();
                }
            });

            slicers.on("click", (dataPoint: ChicletSlicerDataPoint, index: number) => {
                if (!dataPoint.selectable) {
                    return;
                }

                (d3.event as MouseEvent).preventDefault();

                let settings: ChicletSlicerSettings = this.slicerSettings;
                let multiselect: boolean = settings.general.multiselect;

                let selectedIndexes: number[] = jQuery.map(
                    this.dataPoints,
                    (dataPoint: ChicletSlicerDataPoint, index: number) => {
                        if (dataPoint.selected) {
                            return index;
                        };
                    });

                if (settings.general.forcedSelection && selectedIndexes.length === 1) {
                    let availableDataPoints: ChicletSlicerDataPoint[] = jQuery.map(
                        this.dataPoints,
                        (dataPoint: ChicletSlicerDataPoint, index: number) => {
                            if (!dataPoint.filtered) {
                                return dataPoint;
                            };
                        });

                    if (availableDataPoints[index]
                        && this.dataPoints[selectedIndexes[0]].identity === availableDataPoints[index].identity) {
                        return;
                    }
                }

                if ((d3.event as MouseEvent).altKey && multiselect) {
                    let selIndex: number = selectedIndexes.length > 0
                        ? (selectedIndexes[selectedIndexes.length - 1])
                        : 0;

                    if (selIndex > index) {
                        [index, selIndex] = [selIndex, index];
                    }

                    selectionHandler.handleClearSelection();

                    for (let i: number = selIndex; i <= index; i++) {
                        selectionHandler.handleSelection(this.dataPoints[i], true /* isMultiSelect */);
                    }
                } else if ((((d3.event as MouseEvent).ctrlKey || (d3.event as MouseEvent).metaKey)) || multiselect) {
                    selectionHandler.handleSelection(dataPoint, true /* isMultiSelect */);
                } else {
                    selectionHandler.handleSelection(dataPoint, false /* isMultiSelect */);
                }

                this.saveSelection();
            });

            slicerClear.on("click", (d: SelectableDataPoint) => {
                const settings: ChicletSlicerSettings = this.slicerSettings;

                if (settings.general.forcedSelection) {
                    return false;
                }

                selectionHandler.handleClearSelection();

                this.saveSelection();
            });

            this.forceSelection();
        }

        private forceSelection(): void {
            if (!this.slicerSettings.general.forcedSelection) {
                return;
            }

            const isSelected: boolean = _.some(
                this.dataPoints,
                (dataPoint: ChicletSlicerDataPoint) => dataPoint.selected);

            if (!isSelected) {
                for (let i: number = 0; i < this.dataPoints.length; i++) {
                    const dataPoint: ChicletSlicerDataPoint = this.dataPoints[i];

                    if (dataPoint.selectable && !dataPoint.filtered) {
                        this.selectionHandler.handleSelection(dataPoint, false);

                        this.saveSelection();

                        break;
                    }
                }
            }
        }

        public loadSelection(): void {
            this.interactivityService.applySelectionFromFilter(this.slicerSettings.general.filter);
        }

        public saveSelection(): void {
            this.selectionHandler.applySelectionFilter();
        }

        public renderSelection(hasSelection: boolean): void {
            if (!hasSelection && !this.interactivityService.isSelectionModeInverted()) {
                this.slicers.style(
                    "background",
                    this.slicerSettings.slicerText.unselectedColor);
            }
            else {
                this.styleSlicerInputs(this.slicers, hasSelection);
            }
        }

        private renderMouseover(): void {
            this.slicerItemLabels.style({
                "color": (dataPoint: ChicletSlicerDataPoint) => {
                    if (dataPoint.mouseOver) {
                        return this.slicerSettings.slicerText.hoverColor;
                    }

                    if (dataPoint.mouseOut) {
                        return this.slicerSettings.slicerText.fontColor;
                    }
                },
                "opacity": (dataPoint: ChicletSlicerDataPoint) => {
                    if (dataPoint.selectable) {
                        if (dataPoint.mouseOver) {
                            return this.options.isHighContrastMode ? ChicletSlicer.HoveredTextOpacity : ChicletSlicer.DefaultOpacity;
                        }
                    }
                    return ChicletSlicer.DefaultOpacity;
                }
            });
        }

        public styleSlicerInputs(slicers: Selection<any>, hasSelection: boolean) {
            let settings = this.slicerSettings,
                isHighContrastMode = this.options.isHighContrastMode;

            slicers.each(function (dataPoint: ChicletSlicerDataPoint) {
                d3.select(this).style({
                    "background": dataPoint.selectable
                        ? (dataPoint.selected
                            ? settings.slicerText.selectedColor
                            : settings.slicerText.unselectedColor)
                        : settings.slicerText.disabledColor,
                    "opacity": () => {
                        if (isHighContrastMode) {
                            let opacity = dataPoint.selectable ? (dataPoint.selected ? ChicletSlicer.DefaultOpacity : ChicletSlicer.DimmedOpacity) : ChicletSlicer.DisabledOpacity;
                            return opacity;
                        }
                        return ChicletSlicer.DefaultOpacity;
                    }
                });

                d3.select(this).classed("slicerItem-disabled", !dataPoint.selectable);
            });
        }
    }
}
