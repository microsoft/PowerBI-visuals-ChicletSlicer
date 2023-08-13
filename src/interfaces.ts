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

// powerbi.data
import ISQExpr = powerbi.data.ISQExpr;

// powerbi.extensibility.utils.interactivity
import { interactivitySelectionService as interactivityService } from "powerbi-visuals-utils-interactivityutils";
import SelectableDataPoint = interactivityService.SelectableDataPoint;

import { ChicletSlicerSettingsModel } from "./chicletSlicerSettingsModel";

export interface ChicletSlicerData {
    categorySourceName: string;
    formatString: string;
    selfFilterEnabled: boolean;
    slicerDataPoints: ChicletSlicerDataPoint[];
    formattingSettings: ChicletSlicerSettingsModel;
    hasSelectionOverride?: boolean;
    hasHighlights: boolean;
    identityFields: ISQExpr[];
}

export interface ChicletSlicerDataPoint extends SelectableDataPoint {
    identity: any;
    selected: any;
    category?: string;
    value?: number;
    mouseOver?: boolean;
    mouseOut?: boolean;
    isSelectAllDataPoint?: boolean;
    imageURL?: string;
    selectable?: boolean;
    filtered?: boolean;
    id?: number;
    columnName?: any;
}