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

module powerbi.extensibility.visual {

    // TODO: Generate these from above, defining twice just introduces potential for error
    export let chicletSlicerProps = {
        general: {
            orientation: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'orientation' },
            columns: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'columns' },
            rows: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'rows' },
            showDisabled: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'showDisabled' },
            multiselect: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'multiselect' },
            selection: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'selection' },
            selfFilterEnabled: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'selfFilterEnabled' },
        },
        header: {
            show: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'show' },
            title: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'title' },
            fontColor: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'fontColor' },
            background: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'background' },
            outline: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'outline' },
            textSize: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'textSize' },
            outlineColor: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'outlineColor' },
            outlineWeight: <DataViewObjectPropertyIdentifier>{ objectName: 'header', propertyName: 'outlineWeight' }
        },
        rows: {
            fontColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'fontColor' },
            textSize: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'textSize' },
            height: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'height' },
            width: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'width' },
            background: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'background' },
            transparency: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'transparency' },
            selectedColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'selectedColor' },
            hoverColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'hoverColor' },
            unselectedColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'unselectedColor' },
            disabledColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'disabledColor' },
            outline: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'outline' },
            outlineColor: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'outlineColor' },
            outlineWeight: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'outlineWeight' },
            padding: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'padding' },
            borderStyle: <DataViewObjectPropertyIdentifier>{ objectName: 'rows', propertyName: 'borderStyle' },
        },
        images: {
            imageSplit: <DataViewObjectPropertyIdentifier>{ objectName: 'images', propertyName: 'imageSplit' },
            stretchImage: <DataViewObjectPropertyIdentifier>{ objectName: 'images', propertyName: 'stretchImage' },
            bottomImage: <DataViewObjectPropertyIdentifier>{ objectName: 'images', propertyName: 'bottomImage' },
        },
        selectedPropertyIdentifier: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'selected' },
        filterPropertyIdentifier: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'filter' },
        formatString: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'formatString' },
        hasSavedSelection: true,
    };
}
