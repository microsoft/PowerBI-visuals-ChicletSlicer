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

/// <reference path="_references.ts"/>

module powerbi.extensibility.visual.test {
    // powerbi.extensibility.utils.type
    import ValueType = powerbi.extensibility.utils.type.ValueType;

    // powerbi.extensibility.utils.test
    import getRandomNumbers = powerbi.extensibility.utils.test.helpers.getRandomNumbers;
    import CustomizeColumnFn = powerbi.extensibility.utils.test.dataViewBuilder.CustomizeColumnFn;
    import TestDataViewBuilder = powerbi.extensibility.utils.test.dataViewBuilder.TestDataViewBuilder;

    export class ChicletSlicerData extends TestDataViewBuilder {
        public static ColumnCategory: string = "Category";
        public static ColumnValues: string = "Values";
        public static ColumnImage: string = "Image";

        public valuesCategory: string[] = ["BMW", "Mercedes", "Honda", "Toyota", "Ferrari"];
        public valuesValue: number[] = getRandomNumbers(this.valuesCategory.length, 1, 25);

        public valuesImage: string[] = [
            "https://powerbi.com/picture1.png",
            "https://powerbi.com/picture2.png",
            "https://powerbi.com/picture3.png",
            "https://powerbi.com/picture4.gif",
            "https://powerbi.com/picture5.png"
        ];

        public valuesImageWithGaps: string[] = [
            "https://powerbi.com/picture1.png",
            "",
            "https://powerbi.com/picture3.png",
            null,
            "https://powerbi.com/picture5.png"
        ];

        public getDataViewWithoutValues(columnNames?: string[], customizeColumns?: CustomizeColumnFn, imageGaps?: boolean): DataView {
            return this.createCategoricalDataViewBuilder([
                {
                    source: {
                        displayName: ChicletSlicerData.ColumnCategory,
                        roles: { Category: true },
                        type: this.valuesCategory
                    },
                    values: this.valuesCategory
                },
                {
                    source: {
                        displayName: ChicletSlicerData.ColumnImage,
                        roles: { Image: true },
                        type: (imageGaps === true ? this.valuesImageWithGaps : this.valuesImage)
                    },
                    values: (imageGaps === true ? this.valuesImageWithGaps : this.valuesImage)
                }
            ],
            [], columnNames, customizeColumns).build();
        }

        public getDataView(columnNames?: string[], customizeColumns?: CustomizeColumnFn): DataView {
            return this.createCategoricalDataViewBuilder([
                {
                    source: {
                        displayName: ChicletSlicerData.ColumnCategory,
                        roles: { Category: true },
                        type: this.valuesCategory
                    },
                    values: this.valuesCategory
                },
                {
                    source: {
                        displayName: ChicletSlicerData.ColumnImage,
                        roles: { Image: true },
                        type: this.valuesImage
                    },
                    values: this.valuesImage
                }
            ], [
                    {
                        source: {
                            displayName: ChicletSlicerData.ColumnValues,
                            isMeasure: true,
                            roles: { Values: true },
                            type: ValueType.fromDescriptor({ numeric: true }),
                            objects: { dataPoint: { fill: { solid: { color: "purple" } } } },
                        },
                        values: this.valuesValue
                    }], columnNames, customizeColumns).build();
        }
    }
}
