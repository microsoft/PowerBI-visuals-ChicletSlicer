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

import powerbiVisualsApi from "powerbi-visuals-api";
import powerbi = powerbiVisualsApi;

// d3
import { Selection as d3Selection, select as d3Select } from "d3-selection";
type Selection<T1, T2 = T1> = d3Selection<any, T1, any, T2>;

import lodashSome from "lodash.some";

// powerbi.data
import ISQExpr = powerbi.data.ISQExpr;

// powerbi.extensibility.utils.interactivity
import { interactivityBaseService as interactivityService, interactivitySelectionService } from "powerbi-visuals-utils-interactivityutils";
import IInteractiveBehavior = interactivityService.IInteractiveBehavior;
import IBehaviorOptions = interactivityService.IBehaviorOptions;
import IInteractivityService = interactivityService.IInteractivityService;
import ISelectionHandler = interactivityService.ISelectionHandler;
import SelectableDataPoint = interactivitySelectionService.SelectableDataPoint;

import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import { FilterType, IIdentityFilterTarget, IIdentityFilter } from "powerbi-models";
import FilterAction = powerbi.FilterAction;
import IFilter = powerbi.IFilter;

import { ChicletSlicerSettingsModel } from "./chicletSlicerSettingsModel";
import { ChicletSlicer } from "./chicletSlicer";
import { ChicletSlicerDataPoint } from "./interfaces";
import { BaseDataPoint, InteractivityServiceOptions } from "powerbi-visuals-utils-interactivityutils/lib/interactivityBaseService";

export interface ChicletSlicerBehaviorOptions extends IBehaviorOptions<BaseDataPoint> {
    visualHost: IVisualHost;
    slicerItemContainers: Selection<SelectableDataPoint>;
    slicerItemLabels: Selection<any>;
    slicerItemInputs: Selection<any>;
    slicerClear: Selection<any>;
    dataPoints: ChicletSlicerDataPoint[];
    interactivityService: IInteractivityService<BaseDataPoint>;
    slicerSettings: ChicletSlicerSettingsModel;
    identityFields: ISQExpr[] | any;
    isHighContrastMode: boolean;
    behavior: any;
    interactivityServiceOptions: InteractivityServiceOptions;
    jsonFilters: IFilter[] | undefined | any;
}

export class ChicletSlicerWebBehavior implements IInteractiveBehavior {
    private slicers: Selection<SelectableDataPoint>;
    private slicerItemLabels: Selection<any>;
    private slicerItemInputs: Selection<any>;
    private interactivityService: IInteractivityService<BaseDataPoint> | any;
    private slicerSettings: ChicletSlicerSettingsModel;
    private options: ChicletSlicerBehaviorOptions;
    private selectionHandler: ISelectionHandler;
    private visualHost: IVisualHost;
    private jsonFilters: IFilter[] | undefined | any;

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
        this.visualHost = options.visualHost;
        this.selectionHandler = selectionHandler;
        this.jsonFilters = options.jsonFilters;

        this.loadSelection();

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

            let index = dataPoint.id;

            const settings: ChicletSlicerSettingsModel = this.slicerSettings;
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

            if ((<MouseEvent>event).altKey && multiselect) {
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
            } else if ((((<MouseEvent>event).ctrlKey || (<MouseEvent>event).metaKey)) || multiselect) {
                selectionHandler.handleSelection(dataPoint, true /* isMultiSelect */);
            } else {
                selectionHandler.handleSelection(dataPoint, false /* isMultiSelect */);
            }

            this.saveSelection();
        });

        slicerClear.on("click", () => {
            const settings: ChicletSlicerSettingsModel = this.slicerSettings;

            if (settings.generalCardSettings.forcedSelection.value) {
                return false;
            }

            selectionHandler.handleClearSelection();

            this.saveSelection();
        });

        this.forceSelection();
    }

    private forceSelection(): void {
        if (!this.slicerSettings.generalCardSettings.forcedSelection.value) {
            return;
        }

        const isSelected: boolean = lodashSome(
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
        if (this.jsonFilters && this.jsonFilters[0]) {
            const targets = this.jsonFilters[0].target;
            this.interactivityService.selectionManager.clear();
            targets.forEach(target => this.selectionHandler.handleSelection(this.dataPoints[target], true))
        }
    }

    public saveSelection(): void {
        const filterDataPoints: any[] = this.dataPoints.filter(d => d.selected);

        const filterTargets: IIdentityFilterTarget = filterDataPoints.map((dataPoint: any) => {
            return dataPoint.id;
        });

        const filter: IIdentityFilter = {
            $schema: "https://powerbi.com/product/schema#identity",
            filterType: FilterType.Identity,
            operator: "In",
            target: filterTargets
        }

        this.visualHost.applyJsonFilter(filter, "general", "filter", FilterAction.merge);
    }

    public renderSelection(hasSelection: boolean): void {
        if (!hasSelection && !this.interactivityService.isSelectionModeInverted()) {
            this.slicers.style(
                "background",
                this.slicerSettings.slicerTextCardSettings.unselectedColor.value.value);
        }
        else {
            this.styleSlicerInputs(this.slicers);
        }
    }

    private renderMouseover(): void {
        this.slicerItemLabels
            .style("color", (dataPoint: ChicletSlicerDataPoint) => {
                if (dataPoint.mouseOver) {
                    return this.slicerSettings.slicerTextCardSettings.hoverColor.value.value;
                }

                if (dataPoint.mouseOut) {
                    return this.slicerSettings.slicerTextCardSettings.fontColor.value.value;
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

    public styleSlicerInputs(slicers: Selection<any>) {
        const settings = this.slicerSettings,
            isHighContrastMode = this.options.isHighContrastMode;

        slicers.each(function (dataPoint: ChicletSlicerDataPoint) {
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
                });

            d3Select(this).classed("slicerItem-disabled", !dataPoint.selectable);
        });
    }
}
