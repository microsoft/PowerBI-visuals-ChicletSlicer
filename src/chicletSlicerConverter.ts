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

import DataViewCategorical = powerbi.DataViewCategorical;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewMetadata = powerbi.DataViewMetadata;

import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionId = powerbi.visuals.ISelectionId;
import DataView = powerbi.DataView;
import CustomVisualOpaqueIdentity =  powerbi.visuals.CustomVisualOpaqueIdentity;
// powerbi.data
import ISQExpr = powerbi.data.ISQExpr;

import IFilter = powerbi.IFilter;
// powerbi.extensibility.utils.formatting
import { valueFormatter } from "powerbi-visuals-utils-formattingutils";
import { ChicletSlicerDataPoint } from "./interfaces";

export class ChicletSlicerConverter {
    private dataViewCategorical: DataViewCategorical;
    private dataViewMetadata: DataViewMetadata;
    private category: DataViewCategoryColumn;
    private image: DataViewCategoryColumn;
    private categoryIdentities: CustomVisualOpaqueIdentity[];
    private categoryValues: any[];
    private categoryFormatString: string;
    public identityFields: ISQExpr[];

    public numberOfCategoriesSelectedInData: number;
    public dataPoints: ChicletSlicerDataPoint[];
    public hasHighlights: boolean;

    private host: IVisualHost;
    public hasSelectionOverride: boolean;
    private jsonFilters: IFilter[] | any[];

    public constructor(dataView: DataView, host: IVisualHost, jsonFilters: IFilter[] | any[]) {
        const dataViewCategorical: DataViewCategorical = dataView.categorical;
        this.dataViewCategorical = dataViewCategorical;
        this.dataViewMetadata = dataView.metadata;
        this.host = host;
        this.jsonFilters = jsonFilters;

        if (dataViewCategorical.categories && dataViewCategorical.categories.length > 0) {
            this.category = dataViewCategorical.categories[0];
            this.image = dataViewCategorical.categories[1]; // may be undefined
            this.categoryIdentities = this.category.identity;
            this.categoryValues = this.category.values;
            this.identityFields = <ISQExpr[]>this.category.identityFields;
            this.categoryFormatString = valueFormatter.getFormatStringByColumn(this.category.source);
        }

        this.dataPoints = [];

        this.hasSelectionOverride = false;
    }

    public convert(): void {
        this.dataPoints = [];
        this.numberOfCategoriesSelectedInData = 0;
        // If category exists, we render labels using category values. If not, we render labels
        // using measure labels.
        if (this.categoryValues) {
            const objects = this.dataViewMetadata ? <any>this.dataViewMetadata.objects : undefined;
            const isInvertedSelectionMode: boolean = false;
            let numberOfScopeIds: number;

            if (objects && objects.general && objects.general.filter) {
                if (!this.identityFields) {
                    return;
                }
            }

            const hasSelection: boolean =  this.jsonFilters?.length && this.jsonFilters[0]?.target.length > 0;

            const dataViewCategorical = this.dataViewCategorical;
            let value : number = -Infinity;
            this.hasHighlights = false;
            for (let categoryIndex: number = 0; categoryIndex < this.categoryValues.length; categoryIndex++) {
                const identityIndex: number = (<any>this.categoryIdentities[categoryIndex]).identityIndex;
                let categoryIsSelected = this.jsonFilters[0]?.target.includes(identityIndex);
            
                let selectable: boolean = true;
                if (hasSelection != null) {
                    if (isInvertedSelectionMode) {
                        if (this.category.objects == null)
                            categoryIsSelected = undefined;
                        if (categoryIsSelected != null) {
                            categoryIsSelected = hasSelection;
                        } else if (categoryIsSelected == null) {
                            categoryIsSelected = !hasSelection;
                        }
                    } else {
                        if (categoryIsSelected == null) {
                            categoryIsSelected = !hasSelection;
                        }
                    }
                }

                if (categoryIsSelected) {
                    this.numberOfCategoriesSelectedInData++;
                }

                const categoryValue: any = this.categoryValues[categoryIndex], categoryLabel: string = valueFormatter.format(categoryValue, this.categoryFormatString);
                let imageURL: string = '';
                if (this.dataViewCategorical.values) {
                    // Series are either measures in the multi-measure case, or the single series otherwise
                    for (let seriesIndex: number = 0; seriesIndex < this.dataViewCategorical.values.length; seriesIndex++) {
                        const seriesData: any = dataViewCategorical.values[seriesIndex];
                        if (seriesData.values[categoryIndex] != null) {
                            value = <number>seriesData.values[categoryIndex];
                            if (seriesData.highlights) {
                                selectable = !(seriesData.highlights[categoryIndex] === null);
                                this.hasHighlights = true;
                            }
                        }
                    }
                }

                if (this.image) {
                    const uncheckedImageURL = <string>this.image.values[categoryIndex];
                    if (!/^(ftp|http|https):\/\/[^ "]+$/.test(uncheckedImageURL) && !/^data:image/.test(uncheckedImageURL)) {
                        imageURL = undefined;
                    } else {
                        imageURL = uncheckedImageURL;
                    }
                }

                const categorySelectionId: ISelectionId = this.host.createSelectionIdBuilder()
                    .withCategory(this.category, categoryIndex).createSelectionId();
                this.dataPoints.push({
                    identity: <powerbi.visuals.ISelectionId>categorySelectionId,
                    category: categoryLabel,
                    imageURL: imageURL,
                    value: value,
                    selected: categoryIsSelected,
                    selectable: selectable,
                    id: categoryIndex,
                    columnName: this.category.source.displayName
                });
            }
            if (numberOfScopeIds != null && numberOfScopeIds > this.numberOfCategoriesSelectedInData) {
                this.hasSelectionOverride = true;
            }
        }
    }
}
