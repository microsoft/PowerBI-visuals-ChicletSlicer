import * as SVGUtil from "powerbi-visuals-utils-svgutils";
import IMargin = SVGUtil.IMargin;

export interface ChicletSlicerSettings {
    general: {
        orientation: string;
        columns: number;
        rows: number;
        multiselect: boolean;
        forcedSelection: boolean;
        showDisabled: string;
        selection: string;
        filter: any;
        selfFilterEnabled: boolean;
    };
    margin: IMargin;
    header: {
        borderBottomWidth: number;
        show: boolean;
        outline: string;
        fontColor: string;
        background?: string;
        textSize: number;
        outlineColor: string;
        outlineWeight: number;
        title: string;
    };
    headerText: {
        marginLeft: number;
        marginTop: number;
    };
    slicerText: {
        textSize: number;
        height: number;
        width: number;
        fontColor: string;
        selectedColor: string;
        hoverColor: string;
        unselectedColor: string;
        disabledColor: string;
        marginLeft: number;
        outline: string;
        background?: string;
        transparency: number;
        outlineColor: string;
        outlineWeight: number;
        padding: number;
        borderStyle: string;
    };
    slicerItemContainer: {
        marginTop: number;
        marginLeft: number;
    };
    images: {
        imageSplit: number;
        imageRound: boolean;
        stretchImage: boolean;
        bottomImage: boolean;
    };
}