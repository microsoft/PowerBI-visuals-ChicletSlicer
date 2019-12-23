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

    public get mainElement(): JQuery {
        return this.element.children("div.chicletSlicer");
    }

    public get slicerBody(): JQuery {
        return this.mainElement.children("div.slicerBody");
    }

    public get searchHeader(): JQuery {
        return this.mainElement.children("div.searchHeader");
    }

    public get slicerHeader(): JQuery {
        return this.mainElement.children("div.slicerHeader");
    }

    public get slicerHeaderText(): JQuery {
        return this.slicerHeader.children("div.headerText");
    }

    public get visibleGroup(): JQuery {
        return this.mainElement
            .children("div.slicerBody")
            .children("div.scrollRegion")
            .children("div.visibleGroup");
    }

    public get visibleGroupRows(): JQuery {
        return this.visibleGroup.children("div.row");
    }

    public get visibleGroupCells(): JQuery {
        return this.visibleGroupRows.children("div.cell");
    }

    public get slicerTextElements(): JQuery {
        return this.visibleGroup.find(".slicerText");
    }

    public get slicerItemContainers(): JQuery {
        return this.visibleGroupCells
            .children("ul")
            .children(".slicerItemContainer");
    }

    public get slicerItemContainer(): JQuery {
        return this.visibleGroup
            .find("div.row .cell:first .slicerItemContainer");
    }

    public get slicerItemImages(): JQuery {
        return this.slicerItemContainers.children("img.slicer-img-wrapper");
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
