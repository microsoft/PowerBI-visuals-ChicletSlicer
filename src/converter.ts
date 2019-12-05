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
import DataViewCategoricalColumn = powerbi.DataViewCategoricalColumn;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewMetadata = powerbi.DataViewMetadata;

import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionId = powerbi.visuals.ISelectionId;
import DataView = powerbi.DataView;
import DataViewObjectPropertyIdentifier = powerbi.DataViewObjectPropertyIdentifier;
import DataViewScopeIdentity = powerbi.extensibility.visual.DataViewScopeIdentity;

// powerbi.data
import ISQExpr = powerbi.data.ISQExpr;
import SemanticFilter = powerbi.data.ISemanticFilter;

// powerbi.extensibility.utils.formatting
import { valueFormatter } from "powerbi-visuals-utils-formattingutils";

// powerbi.extensibility.utils.dataview
import { dataViewObjects as DataViewObjectsModule } from "powerbi-visuals-utils-dataviewutils";

import { chicletSlicerProps } from "./chicletSlicerProps";
import { ChicletSlicerDataPoint } from "./interfaces";

export class ChicletSlicerConverter {
    private dataViewCategorical: DataViewCategorical;
    private dataViewMetadata: DataViewMetadata;
    private category: DataViewCategoryColumn;
    private image: DataViewCategoryColumn;
    private categoryIdentities: DataViewScopeIdentity[];
    private categoryValues: any[];
    private categoryFormatString: string;
    public identityFields: ISQExpr[];

    public numberOfCategoriesSelectedInData: number;
    public dataPoints: ChicletSlicerDataPoint[];
    public hasHighlights: boolean;

    private host: IVisualHost;
    public hasSelectionOverride: boolean;

    public constructor(dataView: DataView, host: IVisualHost) {
        const dataViewCategorical: DataViewCategorical = dataView.categorical;
        this.dataViewCategorical = dataViewCategorical;
        this.dataViewMetadata = dataView.metadata;
        this.host = host;

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

    private isCategoryColumnSelected(propertyId: DataViewObjectPropertyIdentifier, categories: DataViewCategoricalColumn, idx: number): boolean {
        return categories.objects != null
            && categories.objects[idx]
            && DataViewObjectsModule.getValue<boolean>(categories.objects[idx], propertyId);
    }

    public convert(): void {
        this.dataPoints = [];
        this.numberOfCategoriesSelectedInData = 0;
        // If category exists, we render labels using category values. If not, we render labels
        // using measure labels.
        if (this.categoryValues) {
            let objects = this.dataViewMetadata ? <any>this.dataViewMetadata.objects : undefined;

            let isInvertedSelectionMode: boolean = false;
            let numberOfScopeIds: number;

            if (objects && objects.general && objects.general.filter) {
                if (!this.identityFields) {
                    return;
                }
                let filter: SemanticFilter = <SemanticFilter>objects.general.filter;
            }

            let hasSelection: boolean = undefined;

            if (this.dataViewCategorical.values) {
                for (let idx: number = 0; idx < this.categoryValues.length; idx++) {
                    let selected = this.isCategoryColumnSelected(chicletSlicerProps.selectedPropertyIdentifier, this.category, idx);
                    if (selected != null) {
                        hasSelection = selected;
                        break;
                    }
                }
            }

            let dataViewCategorical = this.dataViewCategorical,
                value: number = -Infinity;

            this.hasHighlights = false;

            for (let categoryIndex: number = 0, categoryCount = this.categoryValues.length; categoryIndex < categoryCount; categoryIndex++) {
                let categoryIsSelected: boolean = this.isCategoryColumnSelected(
                    chicletSlicerProps.selectedPropertyIdentifier,
                    this.category,
                    categoryIndex);

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

                let categoryValue: any = this.categoryValues[categoryIndex],
                    categoryLabel: string = valueFormatter.format(categoryValue, this.categoryFormatString),
                    imageURL: string = '';

                if (this.dataViewCategorical.values) {

                    // Series are either measures in the multi-measure case, or the single series otherwise
                    for (let seriesIndex: number = 0; seriesIndex < this.dataViewCategorical.values.length; seriesIndex++) {
                        let seriesData: any = dataViewCategorical.values[seriesIndex];
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
                    const uncheckedImageURL = this.image.values[categoryIndex] as string;
                    if (!/^(ftp|http|https):\/\/[^ "]+$/.test(uncheckedImageURL) &&
                        !/^data:image/.test(uncheckedImageURL)) {
                        imageURL = undefined;
                    } else {
                        imageURL = uncheckedImageURL;
                    }
                }

                let categorySelectionId: ISelectionId = this.host.createSelectionIdBuilder()
                    .withCategory(this.category, categoryIndex)
                    .createSelectionId();

                this.dataPoints.push({
                    identity: categorySelectionId as powerbi.visuals.ISelectionId,
                    category: categoryLabel,
                    imageURL: imageURL,
                    value: value,
                    selected: false,
                    selectable: selectable
                });
            }

            if (numberOfScopeIds != null && numberOfScopeIds > this.numberOfCategoriesSelectedInData) {
                this.hasSelectionOverride = true;
            }
        }
    }
}
