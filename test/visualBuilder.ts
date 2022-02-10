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

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;

// powerbi.extensibility.utils.test
import { VisualBuilderBase } from "powerbi-visuals-utils-testutils";

// ChicletSlicer1448559807354
import { ChicletSlicer as VisualClass } from "../src/chicletSlicer";
import { ChicletSlicerDataPoint } from "../src/interfaces";

export interface SelectionState {
    items: string;
    state: boolean;
}

export class ChicletSlicerBuilder extends VisualBuilderBase<VisualClass> {
    constructor(width: number, height: number) {
        super(width, height, "ChicletSlicer1448559807354");
    }

    protected build(options: VisualConstructorOptions): VisualClass {
        return new VisualClass(options);
    }

    public get instance(): VisualClass {
        return this.visual;
    }

    public get mainElement(): HTMLElement {
        return this.element.querySelector("div.chicletSlicer");
    }

    public get slicerBody(): HTMLElement {
        return this.mainElement.querySelector("div.slicerBody");
    }

    public get searchHeader(): HTMLElement {
        return this.mainElement.querySelector("div.searchHeader");
    }

    public get slicerHeader(): HTMLElement {
        return this.mainElement.querySelector("div.slicerHeader");
    }

    public get slicerHeaderText(): HTMLElement {
        return this.slicerHeader.querySelector("div.headerText");
    }

    public get visibleGroup(): HTMLElement {
        return this.mainElement
            .querySelector("div.slicerBody")
            .querySelector("div.scrollRegion")
            .querySelector("div.visibleGroup");
    }

    public get visibleGroupRows(): NodeListOf<HTMLElement> {
        return this.visibleGroup.querySelectorAll("div.row");
    }

    public get visibleGroupCells(): NodeListOf<HTMLElement> {
        return this.visibleGroup.querySelectorAll("div.cell");
    }

    public get slicerTextElements(): NodeListOf<HTMLElement> {
        return this.visibleGroup.querySelectorAll(".slicerText");
    }

    public get slicerItemContainers(): NodeListOf<HTMLElement> {
        return this.visibleGroup
            .querySelectorAll(".slicerItemContainer");
    }

    // check if one is expected or all first cells in each container
    public get slicerItemContainer(): HTMLElement {
        return this.visibleGroup
            .querySelector("div.row .cell:first .slicerItemContainer");
    }

    public get slicerItemImages(): NodeListOf<HTMLElement> {
        return this.visibleGroup.querySelectorAll("img.slicer-img-wrapper");
    }

    public getDataPoints(): ChicletSlicerDataPoint[] {
        return this.visual.behavior.dataPoints;
    }

    public getSelectedPoints(): ChicletSlicerDataPoint[] {
        return this.getDataPoints()
            .filter((dataPoint: ChicletSlicerDataPoint) => {
                return dataPoint.selected;
            });
    }

    public getSelectionState(): SelectionState {
        return {
            items: this.visual["settings"]["general"]["selection"],
            state: this.visual["isSelectionSaved"],
        };
    }
}
