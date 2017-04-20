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
    // powerbi.extensibility.visual.test
    import ChicletSlicerData = powerbi.extensibility.visual.test.ChicletSlicerData;
    import ChicletSlicerBuilder = powerbi.extensibility.visual.test.ChicletSlicerBuilder;
    import assertNumberMatch = powerbi.extensibility.visual.test.helpers.assertNumberMatch;
    import convertAnySizeToPixel = powerbi.extensibility.visual.test.helpers.convertAnySizeToPixel;
    import convertColorToRgbColor = powerbi.extensibility.visual.test.helpers.convertColorToRgbColor;
    import getSolidColorStructuralObject = powerbi.extensibility.visual.test.helpers.getSolidColorStructuralObject;

    // powerbi.extensibility.utils.type
    import PixelConverter = powerbi.extensibility.utils.type.PixelConverter;

    // powerbi.extensibility.utils.formatting
    import TextProperties = powerbi.extensibility.utils.formatting.TextProperties;
    import textMeasurementService = powerbi.extensibility.utils.formatting.textMeasurementService;

    // powerbi.extensibility.utils.test
    import RgbColor = powerbi.extensibility.utils.test.helpers.color.RgbColor;
    import MockIVisualHost = powerbi.extensibility.utils.test.mocks.MockIVisualHost;
    import renderTimeout = powerbi.extensibility.utils.test.helpers.renderTimeout;
    import ClickEventType = powerbi.extensibility.utils.test.helpers.ClickEventType;
    import assertColorsMatch = powerbi.extensibility.utils.test.helpers.color.assertColorsMatch;
    import MockISelectionManager = powerbi.extensibility.utils.test.mocks.MockISelectionManager;

    // ChicletSlicer1448559807354
    import TableView = powerbi.extensibility.visual.ChicletSlicer1448559807354.TableView;
    import VisualClass = powerbi.extensibility.visual.ChicletSlicer1448559807354.ChicletSlicer;
    import ChicletSlicerConverter = powerbi.extensibility.visual.ChicletSlicer1448559807354.ChicletSlicerConverter;
    import ChicletSlicerDataPoint = powerbi.extensibility.visual.ChicletSlicer1448559807354.ChicletSlicerDataPoint;

    describe("ChicletSlicer", () => {
        let visualBuilder: ChicletSlicerBuilder,
            defaultDataViewBuilder: ChicletSlicerData,
            dataView: DataView;

        beforeAll(() => {
            (MockISelectionManager as any).prototype.applySelectionFilter = () => { };
        });

        beforeEach(() => {
            visualBuilder = new ChicletSlicerBuilder(1000, 500);
            defaultDataViewBuilder = new ChicletSlicerData();

            dataView = defaultDataViewBuilder.getDataView();
        });

        describe("getValidImageSplit", () => {
            it("should return a min value when argument less than the min value", () => {
                expect(VisualClass.getValidImageSplit(-9999)).toBe(VisualClass.MinImageSplit);
            });

            it("should return a max value when argument more than the max value", () => {
                expect(VisualClass.getValidImageSplit(9999)).toBe(VisualClass.MaxImageSplit);
            });

            it("should return a input value when a input value between the min value and the max value", () => {
                const inputValue: number = 50;

                expect(VisualClass.getValidImageSplit(inputValue)).toBe(inputValue);
            });
        });

        describe("DOM tests", () => {
            it("main element created", () => {
                visualBuilder.updateRenderTimeout(dataView, () => {
                    expect(visualBuilder.mainElement[0]).toBeInDOM();
                });
            });

            it("update", (done) => {
                visualBuilder.updateRenderTimeout(dataView, () => {
                    expect(visualBuilder.visibleGroup[0]).toBeInDOM();

                    expect(visualBuilder.visibleGroup.children("div.row").children(".cell").length)
                        .toBe(dataView.categorical.categories[0].values.length);

                    done();
                });
            });

            it("fit chiclet height to font size with images", (done) => {
                dataView.metadata.objects = {
                    rows: {
                        height: 0
                    }
                };

                visualBuilder.updateRenderTimeout(dataView, () => {
                    const containerHeight: number = Number(visualBuilder.slicerItemContainer
                        .height());

                    const slicerFontSize: number = Number(visualBuilder.slicerItemContainer
                        .find(".slicerText")
                        .css("font-size")
                        .replace(/[^-\d\.]/g, ""));

                    const textProp: TextProperties = VisualClass.getChicletTextProperties(
                        PixelConverter.toPoint(slicerFontSize));

                    const slicerTextDelta: number = textMeasurementService.estimateSvgTextBaselineDelta(textProp);

                    const slicerImgHeight: number = Number(visualBuilder.slicerItemContainer
                        .find(".slicer-img-wrapper")
                        .height());

                    const expectedValue: number = slicerFontSize
                        + slicerTextDelta
                        + slicerImgHeight;

                    expect(containerHeight).toBeGreaterThan(expectedValue);

                    done();
                });
            });

            it("fit chiclet height to font size without images", (done) => {
                dataView = new ChicletSlicerData().getDataView([
                    ChicletSlicerData.ColumnCategory,
                    ChicletSlicerData.ColumnValues
                ]);

                dataView.metadata.objects = {
                    rows: {
                        height: 0,
                        padding: 0
                    }
                };

                visualBuilder.updateRenderTimeout(dataView, () => {
                    const containerHeight: number = Number(visualBuilder.slicerItemContainer
                        .height());

                    const slicerFontSize: number = Number(visualBuilder.slicerItemContainer
                        .find(".slicerText")
                        .css("font-size")
                        .replace(/[^-\d\.]/g, ""));

                    const textProp: TextProperties = VisualClass.getChicletTextProperties(
                        PixelConverter.toPoint(slicerFontSize));

                    const slicerTextDelta: number = textMeasurementService.estimateSvgTextBaselineDelta(textProp);

                    expect(containerHeight).toBeGreaterThan(slicerFontSize + slicerTextDelta);

                    done();
                });
            });

            it("negative image split should behave like 0 (auto)", (done) => {
                dataView.metadata.objects = {
                    images: {
                        imageSplit: -1
                    }
                };

                visualBuilder.updateRenderTimeout(dataView, () => {
                    const chicletImageHeight: string = getImageHeight(visualBuilder);

                    (dataView.metadata.objects as any).images.imageSplit = 0;

                    visualBuilder.updateRenderTimeout(dataView, () => {
                        const chicletImageHeight0: string = getImageHeight(visualBuilder);

                        expect(chicletImageHeight).toEqual(chicletImageHeight0);

                        done();
                    });
                });
            });

            function getImageHeight(visualBuilder: ChicletSlicerBuilder): string {
                return visualBuilder
                    .slicerItemImages
                    .css("height");
            }

            it("negative chiclet rows number should behave like 0 rows (auto) when orientation is vertical", (done) => {
                dataView.metadata.objects = {
                    general: {
                        orientation: "Vertical",
                        rows: -1
                    }
                };

                visualBuilder.update(dataView);

                const chicletTotalRows: number = visualBuilder
                    .visibleGroup
                    .children("div.row")
                    .first()
                    .children(".cell")
                    .length;

                (dataView.metadata.objects as any).general.orientation = "Vertical";
                (dataView.metadata.objects as any).general.rows = 0;

                visualBuilder.updateRenderTimeout(dataView, () => {
                    const chicletTotalRows0: number = visualBuilder
                        .visibleGroup
                        .children("div.row")
                        .first()
                        .children(".cell")
                        .length;

                    expect(chicletTotalRows).toEqual(chicletTotalRows0);

                    done();
                });
            });

            it("negative chiclet rows number should behave like 0 rows (auto) when orientation is horizontal", (done) => {
                dataView.metadata.objects = {
                    general: {
                        orientation: "Horizontal",
                        rows: -1
                    }
                };

                visualBuilder.update(dataView);

                const chicletTotalRows: number = visualBuilder
                    .visibleGroup
                    .children("div.row")
                    .length;

                (dataView.metadata.objects as any).general.orientation = "Horizontal";
                (dataView.metadata.objects as any).general.rows = 0;

                visualBuilder.updateRenderTimeout(dataView, () => {
                    const chicletTotalRows0: number = visualBuilder
                        .visibleGroup
                        .children("div.row")
                        .length;

                    expect(chicletTotalRows).toEqual(chicletTotalRows0);

                    done();
                });
            });

            it("negative chiclet columns number should behave like 0 columns (auto) when orientation is vertical", (done) => {
                dataView.metadata.objects = {
                    general: {
                        orientation: "Vertical",
                        сolumns: -1
                    }
                };

                visualBuilder.update(dataView);

                const chicletTotalColumns: number = visualBuilder
                    .visibleGroup
                    .children("div.row")
                    .length;

                (dataView.metadata.objects as any).general.orientation = "Vertical";
                (dataView.metadata.objects as any).general.сolumns = 0;

                visualBuilder.updateRenderTimeout(dataView, () => {
                    const chicletTotalColumns0: number = visualBuilder
                        .visibleGroup
                        .children("div.row")
                        .length;

                    expect(chicletTotalColumns).toEqual(chicletTotalColumns0);

                    done();
                });
            });

            it("negative chiclet columns number should behave like 0 columns (auto) when orientation is horizontal", (done) => {
                dataView.metadata.objects = {
                    general: {
                        orientation: "Vertical",
                        сolumns: -1
                    }
                };

                visualBuilder.update(dataView);

                const chicletTotalColumns: number = visualBuilder
                    .visibleGroup
                    .children("div.row")
                    .first()
                    .children(".cell")
                    .length;

                (dataView.metadata.objects as any).general.orientation = "Vertical";
                (dataView.metadata.objects as any).general.сolumns = 0;

                visualBuilder.updateRenderTimeout(dataView, () => {
                    const chicletTotalColumns0: number = visualBuilder
                        .visibleGroup
                        .children("div.row")
                        .first()
                        .children(".cell")
                        .length;

                    expect(chicletTotalColumns).toEqual(chicletTotalColumns0);

                    done();
                });
            });

            it("negative chiclet width should behave like 0 width (auto)", (done) => {
                dataView.metadata.objects = {
                    rows: {
                        width: -1
                    }
                };

                visualBuilder.update(dataView);

                let chicletCellWidth: string = visualBuilder
                    .visibleGroup
                    .children("div.row")
                    .children(".cell")
                    .first()
                    .css("width");

                (dataView.metadata.objects as any).rows.width = 0;

                visualBuilder.updateRenderTimeout(dataView, () => {
                    let chicletCellWidth0: string = visualBuilder
                        .visibleGroup
                        .children("div.row")
                        .children(".cell")
                        .first()
                        .css("width");

                    expect(chicletCellWidth).toEqual(chicletCellWidth0);

                    done();
                });
            });

            it("negative chiclet height should behave like 0 height (auto)", (done) => {
                dataView.metadata.objects = {
                    rows: {
                        height: -1
                    }
                };

                visualBuilder.update(dataView);

                const chicletCellHeight: string = visualBuilder
                    .visibleGroup
                    .children("div.row")
                    .children(".cell")
                    .first()
                    .css("height");

                (dataView.metadata.objects as any).rows.height = 0;

                visualBuilder.updateRenderTimeout(dataView, () => {
                    const chicletCellHeight0: string = visualBuilder
                        .visibleGroup
                        .children("div.row")
                        .children(".cell")
                        .first()
                        .css("height");

                    expect(chicletCellHeight).toEqual(chicletCellHeight0);

                    done();
                });
            });

            describe("Selection", () => {
                const selectionId: any[] = [{
                    "selector": { "data": [] }
                }];

                it("saved chiclet selection is received", (done) => {
                    dataView.metadata.objects = {
                        general: {
                            selection: JSON.stringify(selectionId)
                        }
                    };

                    visualBuilder.updateRenderTimeout(dataView, () => {
                        const selection: ISelectionId[] = visualBuilder.getSavedSelection();

                        expect(selection).toBeDefined();
                        expect(selection).toEqual(selectionId);

                        done();
                    });
                });

                it("chiclet selection is saved", (done) => {
                    visualBuilder.updateRenderTimeout(dataView, () => {
                        visualBuilder.saveSelection(selectionId);

                        visualBuilder.updateRenderTimeout(dataView, () => {
                            const selection: string = visualBuilder.getSelectionState().items,
                                stateSelection: boolean = visualBuilder.getSelectionState().state;

                            expect(selection).toBeDefined();
                            expect(stateSelection).toBeDefined();
                            expect(stateSelection).toBe(true);

                            done();
                        });
                    });
                });

                it("a chiclet should be selected after the loading if `forcedSelection` is true", (done) => {
                    dataView.metadata.objects = {
                        general: {
                            forcedSelection: true
                        }
                    };

                    visualBuilder.updateRenderTimeout(dataView, () => {
                        const dataPoints: ChicletSlicerDataPoint[] = visualBuilder.getDataPoints(),
                            selectedDataPoints: ChicletSlicerDataPoint[] = visualBuilder.getSelectedPoints();

                        expect(dataPoints[0]).toBe(selectedDataPoints[0]);

                        done();
                    });
                });
            });

            describe("Cutting off data labels", () => {
                let visualBuilder: ChicletSlicerBuilder;

                beforeEach(() => {
                    visualBuilder = new ChicletSlicerBuilder(150, 500);
                });

                it("data labels shouldn't be cut off", (done) => {
                    const categories: string[] = defaultDataViewBuilder.valuesCategory,
                        amountOfItems: number = categories.length;

                    dataView.metadata.objects = {
                        general: {
                            columns: amountOfItems,
                            rows: amountOfItems
                        }
                    };

                    visualBuilder.updateRenderTimeout(dataView, () => {
                        const slicerTextElements: JQuery = visualBuilder.slicerTextElements;

                        for (let i: number = 0, length: number = slicerTextElements.length; i < length; i++) {
                            let slicerText: string = slicerTextElements[i].textContent,
                                isElementAvailable: boolean;

                            isElementAvailable = categories.some((category: string) => {
                                return slicerText === category;
                            });

                            expect(isElementAvailable).toBeTruthy();
                        }

                        done();
                    });
                });
            });
        });

        describe("Format settings test", () => {
            describe("General", () => {
                it("orientation", () => {
                    const valueCount: number = 5;

                    defaultDataViewBuilder.valuesCategory = _.take(
                        defaultDataViewBuilder.valuesCategory,
                        valueCount);

                    defaultDataViewBuilder.valuesValue = _.take(
                        defaultDataViewBuilder.valuesValue,
                        valueCount);

                    defaultDataViewBuilder.valuesImage = _.take(
                        defaultDataViewBuilder.valuesImage,
                        valueCount);

                    dataView = defaultDataViewBuilder.getDataView();

                    dataView.metadata.objects = {
                        general: {
                            columns: valueCount,
                            rows: Math.round(valueCount / 2),
                            orientation: "Horizontal"
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    expect(visualBuilder.visibleGroupRows.length).toBe(1);

                    (dataView.metadata.objects as any).general.orientation = "Vertical";
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    expect(visualBuilder.visibleGroupRows.length).toBe(2);
                });

                it("columns", () => {
                    const columns: number = Math.min(dataView.categorical.categories[0].values.length, 5);

                    dataView.metadata.objects = {
                        general: {
                            columns,
                            orientation: "Horizontal"
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.visibleGroupRows
                        .toArray()
                        .forEach((element: Element) => {
                            expect($(element).children("div.cell").length).toBe(columns);
                        });
                });

                it("rows", () => {
                    const rows: number = Math.min(dataView.categorical.categories[0].values.length, 5);

                    dataView.metadata.objects = {
                        general: {
                            rows,
                            columns: 1,
                            orientation: "Horizontal"
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    expect(visualBuilder.visibleGroupRows.length).toBe(rows);
                });

                it("show disabled", () => {
                    const highlightedIndex: number = 1;

                    dataView.categorical.values.forEach((column: DataViewValueColumn) => {
                        column.highlights = d3.range(column.values.length).map(() => null);
                    });

                    dataView.categorical.values.forEach((valueColumn: DataViewValueColumn) => {
                        valueColumn.highlights[highlightedIndex] = valueColumn.values[highlightedIndex];
                    });

                    dataView.metadata.objects = {
                        general: {
                            columns: 5,
                            orientation: "Horizontal",
                            showDisabled: "Inplace"
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    const highlightedColor: string = visualBuilder.visibleGroupCells
                        .eq(highlightedIndex)
                        .children("ul")
                        .children("li")
                        .css("background-color");

                    visualBuilder.visibleGroupCells
                        .toArray()
                        .forEach((element: Element, index: number) => {
                            if (index !== highlightedIndex) {
                                const backgroundColor: string = $(element)
                                    .children("ul")
                                    .children("li")
                                    .css("background-color");

                                assertColorsMatch(
                                    backgroundColor,
                                    highlightedColor,
                                    true);
                            }
                        });

                    (dataView.metadata.objects as any).general.showDisabled = "Bottom";
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.visibleGroupCells
                        .toArray()
                        .forEach((element: Element, index: number) => {
                            const backgroundColor: string = $(element)
                                .children("ul")
                                .children("li")
                                .css("background-color");

                            assertColorsMatch(
                                backgroundColor,
                                highlightedColor,
                                index !== 0);
                        });

                    (dataView.metadata.objects as any).general.showDisabled = "Hide";
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    expect(visualBuilder.visibleGroupCells.length).toBe(1);

                    assertColorsMatch(
                        visualBuilder.visibleGroupCells
                            .children("ul")
                            .children("li")
                            .css("background-color"),
                        highlightedColor);
                });

                it( `categories data without disabled elements must be in same sequence after switching to
                    'Bottom' in 'Show disabled' setting`, (done) => {
                    let valuesCategoryData: string[] = [
                        "Alabama",
                        "Alaska",
                        "Arizona",
                        "Arkansas",
                        "California",
                        "Colorado",
                        "Connecticut",
                        "Delaware",
                        "Florida",
                        "Georgia",
                        "Hawaii"
                    ];

                    dataView.categorical.categories[0].values = valuesCategoryData;
                    dataView.metadata.objects = {
                        general: {
                            columns: 3,
                            orientation: "Horizontal",
                            showDisabled: "Bottom"
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    const slicerTextElements: JQuery = visualBuilder.slicerTextElements;

                    for (let i: number = 0, length: number = slicerTextElements.length; i < length; i++) {
                        expect(slicerTextElements[i].textContent).toEqual(valuesCategoryData[i]);
                    }

                    done();
                });

                it("search header is visible", (done) => {
                    dataView.metadata.objects = {
                        general: {
                            selfFilterEnabled: true
                        }
                    };

                    visualBuilder.update(dataView);

                    const searchHeader: HTMLElement = visualBuilder.searchHeader[0];

                    expect(searchHeader.getBoundingClientRect().width).toBeGreaterThan(0);
                    expect(searchHeader.getBoundingClientRect().height).toBeGreaterThan(0);

                    done();
                });

                describe("Multi selection", () => {
                    beforeEach(() => {
                        dataView.metadata.objects = {
                            general: {
                                multiselect: true
                            }
                        };
                    });

                    it("multi selection should work when ctrlKey is pressed", (done) => {
                        testMultiSelection(
                            dataView,
                            visualBuilder,
                            ClickEventType.CtrlKey,
                            defaultDataViewBuilder.valuesCategory.length,
                            done);
                    });

                    it("multi selection should work when metaKey is pressed", (done) => {
                        testMultiSelection(
                            dataView,
                            visualBuilder,
                            ClickEventType.MetaKey,
                            defaultDataViewBuilder.valuesCategory.length,
                            done);
                    });

                    function testMultiSelection(
                        dataView: DataView,
                        visualBuilder: ChicletSlicerBuilder,
                        clickEventType: ClickEventType,
                        lengthOfCategoryValues: number,
                        callback: () => void) {

                        visualBuilder.updateRenderTimeout(dataView, () => {
                            visualBuilder
                                .slicerItemContainers
                                .d3Click(0, 0, clickEventType);

                            checkSelection(
                                visualBuilder,
                                lengthOfCategoryValues,
                                callback);
                        });
                    }

                    function checkSelection(
                        visualBuilder: ChicletSlicerBuilder,
                        lengthOfCategoryValues: number,
                        callback: () => void): void {
                        renderTimeout(() => {
                            let selectedPoints: ChicletSlicerDataPoint[] = visualBuilder.getSelectedPoints();

                            expect(selectedPoints).toBeDefined();
                            expect(selectedPoints).not.toBeNull();

                            expect(selectedPoints.length).toBe(lengthOfCategoryValues);

                            callback();
                        });
                    }
                });
            });

            describe("Header", () => {
                beforeEach(() => {
                    dataView.metadata.objects = {
                        header: {
                            show: true
                        }
                    };
                });

                it("show", () => {
                    (dataView.metadata.objects as any).header.show = false;
                    visualBuilder.updateFlushAllD3Transitions(dataView);
                    expect(visualBuilder.slicerHeader).not.toBeVisible();

                    (dataView.metadata.objects as any).header.show = true;
                    visualBuilder.updateFlushAllD3Transitions(dataView);
                    expect(visualBuilder.slicerHeader).toBeVisible();
                });

                it("title", () => {
                    const title: string = "Power BI";

                    (dataView.metadata.objects as any).header.title = title;
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    expect(visualBuilder.slicerHeaderText.text()).toBe(title);
                });

                it("font color", () => {
                    const color: string = "#123456";

                    (dataView.metadata.objects as any).header.fontColor = getSolidColorStructuralObject(color);
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    assertColorsMatch(visualBuilder.slicerHeaderText.css('color'), color);
                });

                it("background color", () => {
                    const color: string = "#567890";

                    (dataView.metadata.objects as any).header.background = getSolidColorStructuralObject(color);
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    assertColorsMatch(visualBuilder.slicerHeaderText.css('background-color'), color);
                });

                it("font size", () => {
                    const fontSize: number = 22,
                        expectedFontSize: string = "29.3333px";

                    (dataView.metadata.objects as any).header.textSize = fontSize;
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    expect(visualBuilder.slicerHeaderText.css('font-size')).toBe(expectedFontSize);
                });

                it("outline color", () => {
                    const color: string = "#123456";

                    (dataView.metadata.objects as any).header.outlineColor = getSolidColorStructuralObject(color);
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    assertColorsMatch(visualBuilder.slicerHeaderText.css('border-color'), color);
                });

                it("outline weight", () => {
                    const weight: number = 5;

                    (dataView.metadata.objects as any).header.outlineWeight = weight;
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    expect(parseFloat(visualBuilder.slicerHeaderText.css('border-bottom-width'))).toBe(weight);
                });
            });

            describe("Chiclets", () => {
                it("font size", () => {
                    const fontSize: number = 22,
                        expectedFontSize: string = "29.3333px";

                    dataView.metadata.objects = {
                        rows: {
                            textSize: fontSize
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.visibleGroupCells
                        .toArray()
                        .map((element: Element) => {
                            return $(element)
                                .children("ul")
                                .children("li")
                                .children("div.slicer-text-wrapper")
                                .children("span.slicerText");
                        })
                        .forEach((element: JQuery) => {
                            expect(element.css('font-size')).toBe(expectedFontSize);
                        });
                });

                it("height", () => {
                    const height: number = 50;

                    dataView.metadata.objects = {
                        rows: {
                            height
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.visibleGroupCells
                        .toArray()
                        .forEach((element: Element) => {
                            expect($(element).css("height")).toBe(`${height}px`);
                        });
                });

                it("width", () => {
                    const width: number = 50;

                    dataView.metadata.objects = {
                        rows: {
                            width
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.visibleGroupCells
                        .toArray()
                        .forEach((element: Element) => {
                            expect($(element).css("width")).toBe(`${width}px`);
                        });
                });

                it("background", () => {
                    const color: string = "#123234";

                    dataView.metadata.objects = {
                        rows: {
                            background: getSolidColorStructuralObject(color)
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    assertColorsMatch(visualBuilder.slicerBody.css("background-color"), color);
                });

                it("background transparency", () => {
                    const transparencyPercent: number = 30,
                        transparency: number = (100 - transparencyPercent) / 100;

                    dataView.metadata.objects = {
                        rows: {
                            background: getSolidColorStructuralObject("#123234"),
                            transparency: transparencyPercent
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    const bodyRgbColor: RgbColor = convertColorToRgbColor(
                        visualBuilder.slicerBody.css("background-color"));

                    assertNumberMatch(bodyRgbColor.A, transparency, 1);
                });

                it("selected color", () => {
                    const color: string = "#123234";

                    dataView.metadata.objects = {
                        rows: {
                            selectedColor: getSolidColorStructuralObject(color)
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    const firstItem: JQuery = visualBuilder.slicerItemContainers.first();

                    firstItem.click();

                    assertColorsMatch(firstItem.css("background-color"), color);
                });

                it("unselected color", () => {
                    const color: string = "#123234";

                    dataView.metadata.objects = {
                        rows: {
                            unselectedColor: getSolidColorStructuralObject(color)
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    const firstItem: JQuery = visualBuilder.slicerItemContainers.first();

                    assertColorsMatch(firstItem.css("background-color"), color);
                });

                it("hover color", () => {
                    const color: string = "#123234";

                    dataView.metadata.objects = {
                        rows: {
                            hoverColor: getSolidColorStructuralObject(color)
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    let firstItem: JQuery = visualBuilder.slicerItemContainers.first(),
                        firstItemText: JQuery = firstItem
                            .children("div.slicer-text-wrapper")
                            .children("span.slicerText");

                    firstItem[0].dispatchEvent(new Event("mouseover"));

                    assertColorsMatch(firstItemText.css("color"), color);
                });

                it("disabled color", () => {
                    const color: string = "#123234";

                    dataView.metadata.objects = {
                        rows: {
                            disabledColor: getSolidColorStructuralObject(color)
                        }
                    };

                    const highlightedIndex: number = 1;

                    dataView.categorical.values.forEach((valueColumn: DataViewValueColumn) => {
                        valueColumn.highlights = d3.range(valueColumn.values.length).map(x => null);
                    });

                    dataView.categorical.values.forEach((valueColumn: DataViewValueColumn) => {
                        valueColumn.highlights[highlightedIndex] = valueColumn.values[highlightedIndex];
                    });

                    (dataView.metadata.objects as any).general = {
                        showDisabled: "Inplace",
                        columns: dataView.categorical.categories[0].values.length
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.slicerItemContainers
                        .toArray()
                        .forEach((element: Element, index: number) => {
                            assertColorsMatch(
                                $(element).css("background-color"),
                                color,
                                highlightedIndex === index);
                        });
                });

                it("outline color", () => {
                    const color: string = "#123234";

                    dataView.metadata.objects = {
                        rows: {
                            outlineColor: getSolidColorStructuralObject(color)
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    const firstItem: JQuery = visualBuilder.slicerItemContainers.first();

                    assertColorsMatch(firstItem.css("border-color"), color);
                });

                it("text color", () => {
                    const color: string = "#123234";

                    dataView.metadata.objects = {
                        rows: {
                            fontColor: getSolidColorStructuralObject(color)
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.visibleGroupCells
                        .children("ul")
                        .children("li")
                        .children("div.slicer-text-wrapper")
                        .children("span.slicerText")
                        .toArray()
                        .forEach((element: Element) => {
                            assertColorsMatch($(element).css("color"), color);
                        });
                });

                it("outline style", () => {
                    dataView.metadata.objects = {
                        rows: {
                            borderStyle: "Rounded"
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.slicerItemContainers
                        .toArray()
                        .forEach((element: Element) => {
                            expect(convertAnySizeToPixel($(element).css("border-radius"))).toBeGreaterThan(0);
                        });

                    (dataView.metadata.objects as any).rows.borderStyle = "Cut";
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.slicerItemContainers
                        .toArray()
                        .forEach((element: Element) => {
                            expect(convertAnySizeToPixel($(element).css("border-radius"))).toBeGreaterThan(0);
                        });

                    (dataView.metadata.objects as any).rows.borderStyle = "Square";
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.slicerItemContainers
                        .toArray()
                        .forEach((element: Element) => {
                            expect(convertAnySizeToPixel($(element).css("border-radius"))).toBe(0);
                        });
                });

                it("padding", () => {
                    const padding: number = 8;

                    dataView.metadata.objects = {
                        rows: {
                            padding
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.visibleGroupCells
                        .toArray()
                        .forEach((element: Element) => {
                            expect(convertAnySizeToPixel($(element).css("padding"))).toBe(padding);
                        });
                });
            });

            describe("Images", () => {
                it("image split", () => {
                    const imageSplit: number = 10;

                    dataView.metadata.objects = {
                        images: {
                            imageSplit
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.slicerItemImages
                        .toArray()
                        .forEach((element: Element) => {
                            expect(parseFloat($(element).css("max-height"))).toBe(imageSplit);
                        });
                });

                it("stretch image", () => {
                    dataView.metadata.objects = {
                        images: {
                            stretchImage: true
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.slicerItemImages
                        .toArray()
                        .forEach((element: Element) => {
                            expect($(element).is(".stretchImage")).toBeTruthy();
                        });

                    (dataView.metadata.objects as any).images.stretchImage = false;
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.slicerItemImages
                        .toArray()
                        .forEach((element: Element) => {
                            expect($(element).is(".stretchImage")).toBeFalsy();
                        });
                });

                it("bottom image", () => {
                    dataView.metadata.objects = {
                        images: {
                            bottomImage: true
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.slicerItemImages
                        .toArray()
                        .forEach((element: Element) => {
                            expect($(element).is(".bottomImage")).toBeTruthy();
                        });

                    (dataView.metadata.objects as any).images.bottomImage = false;

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.slicerItemImages
                        .toArray()
                        .forEach((element: Element) => {
                            expect($(element).is(".bottomImage")).toBeFalsy();
                        });
                });
            });
        });

        describe("DOM elements should be the same after updating", () => {
            it("the first '.row' should be the same after changing of orientation", (done) => {
                checkElement(
                    visualBuilder,
                    dataView,
                    TableView.RowSelector.selector,
                    done);
            });

            it("the first '.cell' should be the same after changing of orientation", (done) => {
                checkElement(
                    visualBuilder,
                    dataView,
                    TableView.CellSelector.selector,
                    done);
            });

            it("the first '.slicerItemContainer' should be the same after changing of orientation", (done) => {
                checkElement(
                    visualBuilder,
                    dataView,
                    VisualClass.ItemContainerSelector.selector,
                    done);
            });

            it("the first '.slicer-img-wrapper' should be the same after changing of orientation", (done) => {
                checkElement(
                    visualBuilder,
                    dataView,
                    VisualClass.SlicerImgWrapperSelector.selector,
                    done);
            });

            it("the first '.slicer-text-wrapper' should be the same after changing of orientation", (done) => {
                checkElement(
                    visualBuilder,
                    dataView,
                    VisualClass.SlicerTextWrapperSelector.selector,
                    done);
            });

            function checkElement(
                visualBuilder: ChicletSlicerBuilder,
                dataView: DataView,
                selector: string,
                done: () => void): void {

                updateVisual(visualBuilder, dataView, selector).done((firstElement: Element) => {
                    dataView.metadata.objects = {
                        general: {
                            orientation: "Horizontal"
                        }
                    };

                    updateVisual(visualBuilder, dataView, selector).done((secondElement: Element) => {
                        expect(firstElement).toBe(secondElement);

                        done();
                    });
                });

                function updateVisual(
                    visualBuilder: ChicletSlicerBuilder,
                    dataView: DataView,
                    selector: string): JQueryDeferred<Element> {

                    const promise: JQueryDeferred<Element> = $.Deferred<Element>();

                    visualBuilder.updateRenderTimeout(dataView, () => {
                        promise.resolve(visualBuilder.mainElement.find(selector).get(0));
                    });

                    return promise;
                }
            }
        });

        describe("ChicletSlicerChartConversion - ChicletSlicerConverter", () => {
            it("images don't have to be the same if data-set has some empty links", () => {
                const dataViewBuilder: ChicletSlicerData = new ChicletSlicerData(),
                    firstUrl: string = dataViewBuilder.valuesImage[0];

                dataViewBuilder.valuesImage = new Array(dataViewBuilder.valuesImage.length);
                dataViewBuilder.valuesImage[0] = firstUrl;

                let chicletSlicerConverter: ChicletSlicerConverter = new ChicletSlicerConverter(
                    dataViewBuilder.getDataView(),
                    visualBuilder.visualHost);

                chicletSlicerConverter.convert();

                expect(chicletSlicerConverter.dataPoints[0].imageURL).toBe(firstUrl);

                chicletSlicerConverter.dataPoints
                    .slice(1)
                    .forEach((dataPoint: ChicletSlicerDataPoint) => {
                        expect(dataPoint.imageURL).not.toBe(firstUrl);
                    });
            });
        });
    });
}
