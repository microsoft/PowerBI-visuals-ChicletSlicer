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
    import ISemanticFilter = data.ISemanticFilter;

    // powerbi.data
    import Selector = powerbi.data.Selector;
    import ISQExpr = powerbi.data.ISQExpr;

    // powerbi.visuals
    import IInteractiveBehavior = powerbi.visuals.IInteractiveBehavior;
    import SelectableDataPoint = powerbi.visuals.SelectableDataPoint;
    import IInteractivityService = powerbi.visuals.IInteractivityService;
    import ISelectionHandler = powerbi.visuals.ISelectionHandler;

    export interface ChicletSlicerBehaviorOptions {
        slicerItemContainers: Selection<SelectableDataPoint>;
        slicerItemLabels: Selection<any>;
        slicerItemInputs: Selection<any>;
        slicerClear: Selection<any>;
        dataPoints: ChicletSlicerDataPoint[];
        interactivityService: IInteractivityService;
        slicerSettings: ChicletSlicerSettings;
        isSelectionLoaded: boolean;
        identityFields: ISQExpr[];
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
            let slicers = this.slicers = options.slicerItemContainers;

            this.slicerItemLabels = options.slicerItemLabels;
            this.slicerItemInputs = options.slicerItemInputs;

            let slicerClear = options.slicerClear;

            this.dataPoints = options.dataPoints;
            this.interactivityService = options.interactivityService;
            this.slicerSettings = options.slicerSettings;
            this.options = options;

            this.selectionHandler = selectionHandler;

            if (!this.options.isSelectionLoaded) {
                this.loadSelection();
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
                (d3.event as MouseEvent).preventDefault();

                let settings: ChicletSlicerSettings = this.slicerSettings;

                let selectedIndexes: number[] = jQuery.map(
                    this.dataPoints,
                    (dataPoint: ChicletSlicerDataPoint, index: number) => {
                        if (dataPoint.selected) {
                            return index;
                        };
                    });

                if (settings.general.forcedSelection && selectedIndexes.length === 1) {
                    var availableDataPoints: ChicletSlicerDataPoint[] = jQuery.map(
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

                if ((d3.event as MouseEvent).altKey && settings.general.multiselect) {
                    let selIndex = selectedIndexes.length > 0
                        ? (selectedIndexes[selectedIndexes.length - 1])
                        : 0;

                    if (selIndex > index) {
                        let temp = index;
                        index = selIndex;
                        selIndex = temp;
                    }

                    selectionHandler.handleClearSelection();

                    for (let i: number = selIndex; i <= index; i++) {
                        selectionHandler.handleSelection(this.dataPoints[i], true /* isMultiSelect */);
                    }
                } else if (((d3.event as MouseEvent).ctrlKey || (d3.event as MouseEvent).metaKey) && settings.general.multiselect) {
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
            const isSelected: boolean = _.some(this.dataPoints, (dataPoint: ChicletSlicerDataPoint) => dataPoint.selected);

            if (!isSelected) {
                for (let i: number = 0; i < this.dataPoints.length; i++) {
                    let dataPoint: ChicletSlicerDataPoint = this.dataPoints[i];
                    if (dataPoint.selectable && !dataPoint.filtered) {
                        this.selectionHandler.handleSelection(dataPoint, false);
                        this.saveSelection();
                        break;
                    }
                 }
             }
        }

        public loadSelection(): void {
            let savedSelectionIds = this.slicerSettings.general.getSavedSelection();
            if (savedSelectionIds.length) {
                this.selectionHandler.handleClearSelection();
                let selectedDataPoints = this.dataPoints.filter(d => savedSelectionIds.some(x => (d.identity as any).getKey() === x));
                selectedDataPoints.forEach(x => this.selectionHandler.handleSelection(x, true));
                //selectionHandler.persistSelectionFilter(chicletSlicerProps.filterPropertyIdentifier); // selectionHandler doesn't support cross-filtering for now.
            }
        }

        public static getFilterFromSelectors(
            selectedIds: ISelectionId[],
            isSelectionModeInverted: boolean,
            identityFields: ISQExpr | ISQExpr[]): ISemanticFilter {

            let selectors: Selector[] = [],
                filter: ISemanticFilter;

             if (selectedIds.length > 0) {
                 selectors = _.chain(selectedIds)
                     .filter((value: powerbi.visuals.ISelectionId) => value.hasIdentity())
                     .map((value: powerbi.visuals.ISelectionId) => value.getSelector())
                     .value();
            }
            /*
            if (selectors.length) {
                 filter = Selector.filterFromSelector(selectors, isSelectionModeInverted);
            } else if (identityFields) {
                 filter = SemanticFilter.getAnyValueFilter(<ISQExpr[]>identityFields);
            }*/

            return filter;
        }

        public saveSelection(): void {
            let filter: ISemanticFilter,
                selectedIds: ISelectionId[],
                selectionIdKeys: string[],
                identityFields: ISQExpr[];

            selectedIds = <ISelectionId[]>(<any>this.selectionHandler).selectedIds;

            identityFields = this.options ? this.options.identityFields : [];

            filter = ChicletSlicerWebBehavior.getFilterFromSelectors(
                selectedIds,
                this.interactivityService.isSelectionModeInverted(),
                identityFields);

            selectionIdKeys = selectedIds.map(x => (x as any).getKey());

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

        public styleSlicerInputs(slicers: Selection<any>, hasSelection: boolean) {
            let settings = this.slicerSettings;
            let selectedItems = [];
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
}
