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

    import Selection = d3.Selection;
    import UpdateSelection = d3.selection.Update;

    export interface ChicletSlicerBehaviorOptions {
        slicerItemContainers: Selection<any>;
        slicerItemLabels: Selection<any>;
        slicerItemInputs: Selection<any>;
        slicerClear: Selection<any>;
        dataPoints: ChicletSlicerDataPoint[];
        slicerSettings: ChicletSlicerSettings;
        isSelectionLoaded: boolean;
    }

    export interface IInteractiveBehavior {
        /*
        bindEvents(behaviorOptions: any, selectionHandler: ISelectionHandler): void;
        renderSelection(hasSelection: boolean): void;

        hoverLassoRegion?(e: MouseEvent, rect: shapes.BoundingRect): void;
        lassoSelect?(e: MouseEvent, rect: shapes.BoundingRect): void;
        */
    }

    export class ChicletSlicerWebBehavior implements IInteractiveBehavior {
        private slicers: Selection<any>;
        private slicerItemLabels: Selection<any>;
        private slicerItemInputs: Selection<any>;
        private dataPoints: ChicletSlicerDataPoint[];
        private slicerSettings: ChicletSlicerSettings;
        private options: ChicletSlicerBehaviorOptions;

        private selectionManager: ISelectionManager

        constructor(selectionManager: ISelectionManager) {
            this.selectionManager = selectionManager;
        }

        public bindEvents(options: ChicletSlicerBehaviorOptions): void {
            let slicers = this.slicers = options.slicerItemContainers;

            this.slicerItemLabels = options.slicerItemLabels;
            this.slicerItemInputs = options.slicerItemInputs;

            let slicerClear = options.slicerClear;

            this.dataPoints = options.dataPoints;
            this.slicerSettings = options.slicerSettings;
            this.options = options;

            if (!this.options.isSelectionLoaded) {
                //this.loadSelection(selectionHandler);
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

                (d3.event as Event).preventDefault();

                let settings: ChicletSlicerSettings = this.slicerSettings;

                if ((d3.event as KeyboardEvent).altKey && settings.general.multiselect) {
                    let selectedIndexes = jQuery.map(this.dataPoints, (d, index) => {
                        if (d.selected) {
                            return index;
                        };
                    });

                    let selIndex: number = selectedIndexes.length > 0
                        ? (selectedIndexes[selectedIndexes.length - 1])
                        : 0;

                    if (selIndex > index) {
                        [index, selIndex] = [selIndex, index];
                    }
                    let selectedItems: ISelectionId[] = [];

                    for (let i: number = selIndex; i <= index; i++) {
                        selectedItems.push(this.dataPoints[i].identity);
                    }

                    this.selectionManager.clear().then(() => {
                        this.selectionManager.select(selectedItems, true).then((ids: ISelectionId[]) => this.renderSelection(ids));
                    });
                } else if (((d3.event as KeyboardEvent).ctrlKey || (d3.event as KeyboardEvent).metaKey) && settings.general.multiselect) {
                   this.selectionManager.select(dataPoint.identity, true).then((ids: ISelectionId[]) => this.renderSelection(ids));;
                } else {
                    this.selectionManager.select(dataPoint.identity, false).then((ids: ISelectionId[]) => this.renderSelection(ids));;
                }

            });

            slicerClear.on("click", (d: SelectableDataPoint) => {
                this.selectionManager.clear().then((ids: ISelectionId[]) => this.renderSelection(ids));
            });
        }

        private renderSelection(ids: ISelectionId[]): void {
            this.slicers.each(function (d: ChicletSlicerDataPoint) {
                d.selected = _.some(ids, d.identity);
            });
            this.styleSlicerInputs();
        }

        public styleSlicerInputs(): void {
            debugger
            const settings: ChicletSlicerSettings = this.slicerSettings;
            let hasHighlight: boolean = !this.slicers.filter((d: ChicletSlicerDataPoint) => {
                return d.highlight;
            }).empty();
            let hasSelection: boolean = this.selectionManager.hasSelection();

            this.slicers.each(function (d: ChicletSlicerDataPoint) {
                let selected: boolean = (hasHighlight && d.highlight) || (!hasHighlight && d.selected);

                d3.select(this).style({
                    'background': d.selectable ? (selected ? settings.slicerText.selectedColor : settings.slicerText.unselectedColor)
                        : settings.slicerText.disabledColor
                });

                d3.select(this).classed('slicerItem-disabled', !d.selectable);
            });

           //this.saveSelection();
        }

        private renderMouseover(): void {
            this.slicerItemLabels.style({
                'color': (d: ChicletSlicerDataPoint) => {
                    if (d.mouseOver) {
                        return this.slicerSettings.slicerText.hoverColor;
                    }

                    if (d.mouseOut) {
                        if (d.selected) {
                            return this.slicerSettings.slicerText.fontColor;
                        } else {
                            return this.slicerSettings.slicerText.fontColor;
                        }
                    }
                }
            });
        }

        public applySelectionStateToData(dataPoints: SelectableDataPoint[]): void {
            if (!this.selectionManager.hasSelection()) {
                return;
            }

            let selectedIds: ISelectionId[] = this.selectionManager.getSelectionIds();

            dataPoints.forEach((d: SelectableDataPoint) => {
                d.selected = _.some(selectedIds, d.identity);
            });
        }

        /*
        public loadSelection(selectionHandler: ISelectionHandler): void {
            selectionHandler.handleClearSelection();
            let savedSelectionIds = this.slicerSettings.general.getSavedSelection();
            if (savedSelectionIds.length) {
                let selectedDataPoints = this.dataPoints.filter(d => savedSelectionIds.some(x => d.identity.getKey() === x));
                selectedDataPoints.forEach(x => selectionHandler.handleSelection(x, true));
                selectionHandler.persistSelectionFilter(chicletSlicerProps.filterPropertyIdentifier);
            }
        }

        private static getFilterFromSelectors(selectionHandler: ISelectionHandler, isSelectionModeInverted: boolean): SemanticFilter {
            let selectors: Selector[] = [];
            let selectedIds: SelectionId[] = <SelectionId[]>(<any>selectionHandler).selectedIds;

            if (selectedIds.length > 0) {
                selectors = _.chain(selectedIds)
                    .filter((value: SelectionId) => value.hasIdentity())
                    .map((value: SelectionId) => value.getSelector())
                    .value();
            }

            let filter: SemanticFilter = Selector.filterFromSelector(selectors, isSelectionModeInverted);
            return filter;
        }

        public saveSelection(selectionHandler: ISelectionHandler): void {
            let filter: SemanticFilter = ChicletSlicerWebBehavior.getFilterFromSelectors(selectionHandler, this.interactivityService.isSelectionModeInverted());
            let selectionIdKeys = (<SelectionId[]>(<any>selectionHandler).selectedIds).map(x => x.getKey());
            this.slicerSettings.general.setSavedSelection(filter, selectionIdKeys);
        }
 */

    }

}
