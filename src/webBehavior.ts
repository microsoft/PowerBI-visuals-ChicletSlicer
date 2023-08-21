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

import powerbi from "powerbi-visuals-api";

// d3
import { Selection as d3Selection, select as d3Select } from "d3-selection";
type Selection<T1, T2 = T1> = d3Selection<any, T1, any, T2>;

import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import { FilterType, IIdentityFilterTarget, IIdentityFilter } from "powerbi-models";
import FilterAction = powerbi.FilterAction;
import IFilter = powerbi.IFilter;

import { ChicletSlicerSettingsModel } from "./chicletSlicerSettingsModel";
import { ChicletSlicer } from "./chicletSlicer";
import { ChicletSlicerDataPoint } from "./interfaces";

export interface ChicletSlicerBehaviorOptions {
    visualHost: IVisualHost;
    slicerItemContainers: Selection<any>;
    slicerItemLabels: Selection<any>;
    slicerItemInputs: Selection<any>;
    slicerClear: Selection<any>;
    dataPoints: ChicletSlicerDataPoint[];
    formattingSettings: ChicletSlicerSettingsModel;
    isHighContrastMode: boolean;
    jsonFilters: IFilter[] | undefined | any;
}

export class ChicletSlicerWebBehavior {
    private slicers: Selection<any>;
    private slicerItemLabels: Selection<any>;
    private slicerItemInputs: Selection<any>;
    private formattingSettings: ChicletSlicerSettingsModel;
    private options: ChicletSlicerBehaviorOptions;
    private visualHost: IVisualHost;
    private jsonFilters: IFilter[] | undefined | any;

    /**
     * Public for testability.
     */
    public dataPoints: ChicletSlicerDataPoint[];

    public bindEvents(options: ChicletSlicerBehaviorOptions): void {
        const slicers: Selection<any> = this.slicers = options.slicerItemContainers,
            slicerClear: Selection<any> = options.slicerClear;

        this.slicerItemLabels = options.slicerItemLabels;
        this.slicerItemInputs = options.slicerItemInputs;
        this.dataPoints = options.dataPoints;

        this.formattingSettings = options.formattingSettings;
        this.options = options;
        this.visualHost = options.visualHost;
        this.jsonFilters = options.jsonFilters;

        slicers.on("mouseover", (event, dataPoint: ChicletSlicerDataPoint) => {
            if (dataPoint.selectable) {
                dataPoint.mouseOver = true;
                dataPoint.mouseOut = false;

                this.renderMouseover();
            }
        });

        slicers.on("mouseout", (event, dataPoint: ChicletSlicerDataPoint) => {
            if (dataPoint.selectable) {
                dataPoint.mouseOver = false;
                dataPoint.mouseOut = true;

                this.renderMouseover();
            }
        });

        slicers.on("click", (event, dataPoint: ChicletSlicerDataPoint) => {
            if (!dataPoint.selectable) {
                return;
            }
            (<MouseEvent>event).preventDefault();

            const index = dataPoint.id;

            const settings: ChicletSlicerSettingsModel = this.formattingSettings;
            const multiselect: boolean = settings.generalCardSettings.multiselect.value;

            const selectedIndexes: number[] = this.dataPoints
                .filter((dataPoint: ChicletSlicerDataPoint) => dataPoint.selected)
                .map(dataPoint => dataPoint.id);

            if (settings.generalCardSettings.forcedSelection.value && selectedIndexes.length === 1) {
                const availableDataPoints: ChicletSlicerDataPoint[] = this.dataPoints.map((dataPoint: ChicletSlicerDataPoint) => {
                    if (!dataPoint.filtered) {
                        return dataPoint;
                    }
                });

                if (availableDataPoints[index]
                    && this.dataPoints[selectedIndexes[0]].identity === availableDataPoints[index].identity) {
                    return;
                }
            }

            if ((((<MouseEvent>event).ctrlKey || (<MouseEvent>event).metaKey)) || multiselect) {
                this.handleSelection(dataPoint, true /* isMultiSelect */);
            } else {
                this.handleSelection(dataPoint, false /* isMultiSelect */);
            }
        });

        slicerClear.on("click", () => {
            const settings: ChicletSlicerSettingsModel = this.formattingSettings;

            if (settings.generalCardSettings.forcedSelection.value) {
                return false;
            }

            this.handleClearSelection();
        });

        this.renderSelection();
        this.forceSelection();
    }

    private forceSelection(): void {
        if (!this.formattingSettings.generalCardSettings.forcedSelection.value) {
            return;
        }

        const isSelected: boolean = this.dataPoints.some((dataPoint: ChicletSlicerDataPoint) => dataPoint.selected);
        if (!isSelected) {
            const dataPoint = this.dataPoints.find((dataPoint: ChicletSlicerDataPoint) => dataPoint.selectable && !dataPoint.filtered);
            if (dataPoint) {
                dataPoint.selected = true;

                this.renderSelection();
                this.saveSelection();
            }
        }
    }

    private handleSelection(selecteDataPoint: ChicletSlicerDataPoint, multiSelect: boolean): void {
        this.dataPoints.forEach((dataPoint: ChicletSlicerDataPoint) => {
            if (selecteDataPoint.id === dataPoint.id) {
                dataPoint.selected = !dataPoint.selected;
            } else if (!multiSelect) {
                dataPoint.selected = false;
            }
        });

        this.renderSelection();
        this.saveSelection();
    }

    private handleClearSelection() {
        this.dataPoints.forEach((dataPoint: ChicletSlicerDataPoint) => {
            dataPoint.selected = false;
        });

        this.renderSelection();
        this.saveSelection();
    }

    private saveSelection(): void {
        const filterTargets: IIdentityFilterTarget = this.dataPoints
            .filter(d => d.selected)
            .map(d => d.id);

        // Selection manager stores selection ids in the order in which they are selected by the user.
        // This is needed because data should be sent to the host in the same order that the user selected.
        // If the order is not maintained, the host will show incorrect data in the visual.

        const target = (this.jsonFilters?.length && this.jsonFilters[0]?.target) ? this.jsonFilters[0].target : [];
        const sortedTargers = ChicletSlicerWebBehavior.sortByJSONFilterTarget(filterTargets, target);

        const filter: IIdentityFilter = {
            $schema: "https://powerbi.com/product/schema#identity",
            filterType: FilterType.Identity,
            operator: "In",
            target: sortedTargers
        }

        this.visualHost.applyJsonFilter(filter, "general", "filter", FilterAction.merge);
    }

    public static sortByJSONFilterTarget(selected, jsonFilters: number[]): number[] {
        const reversed = jsonFilters.reverse();

        function compareIndexes(a, b: number) {
            return reversed.indexOf(b) - reversed.indexOf(a);
        }
        return selected.toSorted(compareIndexes);
    }

    private renderMouseover(): void {
        this.slicerItemLabels
            .style("color", (dataPoint: ChicletSlicerDataPoint) => {
                if (dataPoint.mouseOver) {
                    return this.formattingSettings.slicerTextCardSettings.hoverColor.value.value;
                }

                if (dataPoint.mouseOut) {
                    return this.formattingSettings.slicerTextCardSettings.fontColor.value.value;
                }
            })
            .style("opacity", (dataPoint: ChicletSlicerDataPoint) => {
                if (dataPoint.selectable) {
                    if (dataPoint.mouseOver) {
                        return this.options.isHighContrastMode ? ChicletSlicer.HoveredTextOpacity : ChicletSlicer.DefaultOpacity;
                    }
                }
                return ChicletSlicer.DefaultOpacity;
            });
    }

    private renderSelection() {
        const settings = this.formattingSettings,
            isHighContrastMode = this.options.isHighContrastMode;

        this.slicers.each(function (dataPoint: ChicletSlicerDataPoint) {
            d3Select(this)
                .style("background", dataPoint.selectable
                    ? (dataPoint.selected
                        ? settings.slicerTextCardSettings.selectedColor.value.value
                        : settings.slicerTextCardSettings.unselectedColor.value.value)
                    : settings.slicerTextCardSettings.disabledColor.value.value)
                .style("opacity", () => {
                    if (isHighContrastMode) {
                        return dataPoint.selectable ?
                            (dataPoint.selected ? ChicletSlicer.DefaultOpacity : ChicletSlicer.DimmedOpacity)
                            : ChicletSlicer.DisabledOpacity;
                    }
                    return ChicletSlicer.DefaultOpacity;
                })
                .classed("slicerItem-disabled", !dataPoint.selectable);
        });
    }
}
