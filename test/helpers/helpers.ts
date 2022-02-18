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

import * as lodash from "lodash";

// jasmine
import * as jasmine from "karma-jasmine";
//import Matchers = jasmine.Matchers;

// powerbi.extensibility.utils.type
import { pixelConverter as PixelConverter } from "powerbi-visuals-utils-typeutils";
import { RgbColor, parseColorString } from "powerbi-visuals-utils-colorutils";

export function getSolidColorStructuralObject(color: string): any {
    return { solid: { color } };
}

export function convertAnySizeToPixel(size: string, round?: number): number {
    let result: number;

    switch (lodash.takeRight(size, 2).join("").toLowerCase()) {
        case "pt": {
            result = PixelConverter.fromPointToPixel(parseFloat(size));
            break;
        }
        case "px": {
            result = parseFloat(size);
            break;
        }
    }

    return lodash.isNumber(round)
        ? roundTo(result, round)
        : result;
}

export function roundTo(value: number | string, round: number): number {
    value = lodash.isNumber(value)
        ? value
        : parseFloat(value);

    return lodash.isNumber(value)
        ? parseFloat((value).toFixed(round))
        : <any>value;
}

export function convertColorToRgbColor(color: string): RgbColor {
    return parseColorString(color);
}

export function assertNumberMatch(actual: number, expected: number, round: number, invert?: boolean) {
    const expectedResult = roundTo(actual, round);
    const result = roundTo(expected, round);

    if (invert) {
        expect(expectedResult).not.toBe(result)
    }

    expect(expectedResult).toBe(result);
}

export function areColorsEqual(firstColor: string, secondColor: string): boolean {
    const firstConvertedColor: RgbColor = parseColorString(firstColor),
        secondConvertedColor: RgbColor = parseColorString(secondColor);

    return firstConvertedColor.R === secondConvertedColor.R
        && firstConvertedColor.G === secondConvertedColor.G
        && firstConvertedColor.B === secondConvertedColor.B;
}

export function isColorAppliedToElements(
    elements: HTMLElement[],
    color?: string,
    colorStyleName: string = "fill"
): boolean {
    return elements.some((element: HTMLElement) => {
        const currentColor: string = element.style[colorStyleName];

        if (!currentColor || !color) {
            return currentColor === color;
        }

        return areColorsEqual(currentColor, color);
    });
}
