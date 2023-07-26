import powerbiVisualsApi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import ILocalizationManager = powerbi.extensibility.ILocalizationManager;

import Card = formattingSettings.Card;
import Model = formattingSettings.Model;

import IEnumMember = powerbi.IEnumMember;

const orientationOptions : IEnumMember[] = [
    { displayName: "Visual_Orientation_Horizontal", value: "Horizontal" },
    { displayName: "Visual_Orientation_Vertical", value: "Vertical" },
]

const showDisabledOptions : IEnumMember[] = [
    { displayName: "Visual_ShowDisabled_Inplace", value: "Inplace" },
    { displayName: "Visual_ShowDisabled_Bottom", value: "Bottom" },
    { displayName: "Visual_ShowDisabled_Hide", value: "Hide" },
]

const outlineOptions : IEnumMember[] = [
    { displayName: "formattingHeaderOutlineTypeNone", value: "None" },
    { displayName: "formattingHeaderOutlineTypeBottomOnly", value: "BottomOnly" },
    { displayName: "formattingHeaderOutlineTypeTopOnly", value: "TopOnly" },
    { displayName: "formattingHeaderOutlineTypeTopBottom", value: "TopBottom" },
    { displayName: "formattingHeaderOutlineTypeLeftRight", value: "LeftRight" },
    { displayName: "formattingHeaderOutlineTypeFrame", value: "Frame" },
]

const borderStyleOptions : IEnumMember[] = [
    { displayName: "Visual_OutlineStyle_Rounded", value: "Rounded" },
    { displayName: "Visual_OutlineStyle_Cut", value: "Cut" },
    { displayName: "Visual_OutlineStyle_Square", value: "Square" },
]

class ColumnsSettings {
    public static readonly DefaultValue: number = 3;
    public static readonly MinValue: number = 0;
}

class RowsSettings {
    public static readonly DefaultValue: number = 0;
    public static readonly MinValue: number = 0;
    public static readonly MaxValue: number = 1000;
}

class TextSizeSettings {
    public static readonly DefaultValue: number = 10;
    public static readonly MinValue: number = 8;
    public static readonly MaxValue: number = 60;
}

class OutlineWeightSettings {
    public static readonly DefaultValue: number = 1;
    public static readonly MinValue: number = 1;
    public static readonly MaxValue: number = 10;
}

class TextHeightSettings {
    public static readonly DefaultValue: number = 0;
    public static readonly MinValue: number = 0;
}

class TextWidthSettings {
    public static readonly DefaultValue: number = 0;
    public static readonly MinValue: number = 0;
}

class PaddingSettings {
    public static readonly DefaultValue: number = 3;
    public static readonly MinValue: number = 0;
}

class ImagesSplitSettings {
    public static readonly DefaultValue: number = 50;
    public static readonly MinValue: number = 0;
    public static readonly MaxValue: number = 100;
}

export class GeneralCardSettings extends Card {

    orientation = new formattingSettings.ItemDropdown({
        name: "orientation",
        displayNameKey: "Visual_Orientation",
        items: orientationOptions,
        value: orientationOptions[1]
    });

    columns = new formattingSettings.NumUpDown({
        name: "columns",
        displayNameKey: "Visual_Columns",
        value: ColumnsSettings.DefaultValue,
        options: {
            minValue: {
                type: powerbiVisualsApi.visuals.ValidatorType.Min,
                value: ColumnsSettings.MinValue,
            }
        }
    });

    rows = new formattingSettings.NumUpDown({
        name: "rows",
        displayNameKey: "Visual_Rows",
        value: RowsSettings.DefaultValue,
        options: {
            minValue: {
                type: powerbiVisualsApi.visuals.ValidatorType.Min,
                value: RowsSettings.MinValue,
            },
            maxValue: {
                type: powerbiVisualsApi.visuals.ValidatorType.Max,
                value: RowsSettings.MaxValue,
            }
        }
    });

    showDisabled = new formattingSettings.ItemDropdown({
        name: "showDisabled",
        displayNameKey: "Visual_ShowDisabled",
        items: showDisabledOptions,
        value: showDisabledOptions[0]
    });

    multiselect = new formattingSettings.ToggleSwitch({
        name: "multiselect",
        displayNameKey: "Visual_MultipleSelection",
        value: true,
        topLevelToggle: false
    });

    forcedSelection = new formattingSettings.ToggleSwitch({
        name: "forcedSelection",
        displayNameKey: "Visual_ForcedSelection",
        value: false,
        topLevelToggle: false
    });

    name: string = "general";
    displayNameKey: string = "Visual_General";
    slices = [this.orientation, this.columns, this.rows, this.showDisabled, this.multiselect, this.forcedSelection];

    revertToDefaultDescriptors: [
        {
            objectName: "general"
            propertyName: "orientation"
        },
        {
            objectName: "general"
            propertyName: "columns"
        },
        {
            objectName: "general"
            propertyName: "rows"
        },
        {
            objectName: "general"
            propertyName: "showDisabled"
        },
        {
            objectName: "general"
            propertyName: "multiselect"
        },
        {
            objectName: "general"
            propertyName: "forcedSelection"
        }
    ]
}

export class HeaderCardSettings extends Card {

    public borderBottomWidth: number = 1;

    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayNameKey: "Visual_Show",
        value: true,
        topLevelToggle: true
    });

    title = new formattingSettings.TextInput({
        name: "title",
        displayNameKey: "Visual_Title",
        placeholder: "",
        value: ""
    });

    fontColor = new formattingSettings.ColorPicker({
        name: "fontColor",
        displayNameKey: "Visual_FontColor",
        value: { value: "#a6a6a6" }
    });

    background = new formattingSettings.ColorPicker({
        name: "background",
        displayNameKey: "Visual_Background",
        value: { value: null }
    });

    textSize = new formattingSettings.NumUpDown({
        name: "textSize",
        displayNameKey: "Visual_TextSize",
        value: TextSizeSettings.DefaultValue,
        options: {
            minValue: {
                type: powerbiVisualsApi.visuals.ValidatorType.Min,
                value: TextSizeSettings.MinValue,
            },
            maxValue: {
                type: powerbiVisualsApi.visuals.ValidatorType.Max,
                value: TextSizeSettings.MaxValue,
            }
        }
    });

    outline = new formattingSettings.ItemDropdown({
        name: "outline",
        displayNameKey: "formattingHeaderOutlineType",
        items: outlineOptions,
        value: outlineOptions[1]
    });

    outlineColor = new formattingSettings.ColorPicker({
        name: "outlineColor",
        displayNameKey: "Visual_OutlineColor",
        value: { value: "#a6a6a6" }
    });

    outlineWeight = new formattingSettings.NumUpDown({
        name: "outlineWeight",
        displayNameKey: "Visual_OutlineWeight",
        value: OutlineWeightSettings.DefaultValue,
        options: {
            minValue: {
                type: powerbiVisualsApi.visuals.ValidatorType.Min,
                value: OutlineWeightSettings.MinValue,
            },
            maxValue: {
                type: powerbiVisualsApi.visuals.ValidatorType.Max,
                value: OutlineWeightSettings.MaxValue,
            }
        }
    });

    name: string = "header";
    displayNameKey: string = "Visual_Header";
    slices = [this.show, this.title, this.fontColor, this.background, this.textSize, this.outline, this.outlineColor, this.outlineWeight];

    revertToDefaultDescriptors: [
        {
            objectName: "header"
            propertyName: "show"
        },
        {
            objectName: "header"
            propertyName: "title"
        },
        {
            objectName: "header"
            propertyName: "fontColor"
        },
        {
            objectName: "header"
            propertyName: "background"
        },
        {
            objectName: "header"
            propertyName: "textSize"
        },
        {
            objectName: "header"
            propertyName: "outline"
        },
        {
            objectName: "header"
            propertyName: "outlineColor"
        },
        {
            objectName: "header"
            propertyName: "outlineWeight"
        }
    ]
}

export class SlicerTextCardSettings extends Card {

    public outline: string = "Frame";

    textSize = new formattingSettings.NumUpDown({
        name: "textSize",
        displayNameKey: "Visual_TextSize",
        value: TextSizeSettings.DefaultValue,
        options: {
            minValue: {
                type: powerbiVisualsApi.visuals.ValidatorType.Min,
                value: TextSizeSettings.MinValue,
            },
            maxValue: {
                type: powerbiVisualsApi.visuals.ValidatorType.Max,
                value: TextSizeSettings.MaxValue,
            }
        }
    });

    height = new formattingSettings.NumUpDown({
        name: "height",
        displayNameKey: "Visual_Height",
        value: TextHeightSettings.DefaultValue,
        options: {
            minValue: {
                type: powerbiVisualsApi.visuals.ValidatorType.Min,
                value: TextHeightSettings.MinValue,
            }
        }
    });

    width = new formattingSettings.NumUpDown({
        name: "width",
        displayNameKey: "Visual_Width",
        value: TextWidthSettings.DefaultValue,
        options: {
            minValue: {
                type: powerbiVisualsApi.visuals.ValidatorType.Min,
                value: TextWidthSettings.MinValue,
            }
        }
    });

    background = new formattingSettings.ColorPicker({
        name: "background",
        displayNameKey: "Visual_Background",
        value: { value : null }
    });

    transparency = new formattingSettings.Slider({
        name: "transparency",
        displayNameKey: "Visual_Transparency",
        descriptionKey: "Visual_Description_Transparency",
        value: 0
    });

    selectedColor = new formattingSettings.ColorPicker({
        name: "selectedColor",
        displayNameKey: "Visual_SelectedColor",
        value: { value: "#BDD7EE" }
    });

    hoverColor = new formattingSettings.ColorPicker({
        name: "hoverColor",
        displayNameKey: "Visual_HoverColor",
        value: { value: "#212121" }
    });

    unselectedColor = new formattingSettings.ColorPicker({
        name: "unselectedColor",
        displayNameKey: "Visual_UnselectedColor",
        value: { value: "#ffffff" }
    });

    disabledColor = new formattingSettings.ColorPicker({
        name: "disabledColor",
        displayNameKey: "Visual_DisabledColor",
        value: { value: "grey" },
    });

    outlineColor = new formattingSettings.ColorPicker({
        name: "outlineColor",
        displayNameKey: "Visual_OutlineColor",
        value: { value: "#000000" }
    });
    
    outlineWeight = new formattingSettings.NumUpDown({
        name: "outlineWeight",
        displayNameKey: "Visual_OutlineWeight",
        value: OutlineWeightSettings.DefaultValue,
        options: {
            minValue: {
                type: powerbiVisualsApi.visuals.ValidatorType.Min,
                value: OutlineWeightSettings.MinValue,
            }
        }
    });

    fontColor = new formattingSettings.ColorPicker({
        name: "fontColor",
        displayNameKey: "Visual_TextColor",
        value: { value: "#666666" }
    });

    padding = new formattingSettings.NumUpDown({
        name: "padding",
        displayNameKey: "Visual_Padding",
        value: PaddingSettings.DefaultValue,
        options: {
            minValue: {
                type: powerbiVisualsApi.visuals.ValidatorType.Min,
                value: PaddingSettings.MinValue,
            }
        }
    });

    borderStyle = new formattingSettings.ItemDropdown({
        name: "borderStyle",
        displayNameKey: "Visual_OutlineStyle",
        items: borderStyleOptions,
        value: borderStyleOptions[1]
    });

    name: string = "rows";
    displayNameKey: string = "Visual_Chiclets";
    slices = [this.textSize, this.height, this.width, this.background, this.transparency, this.selectedColor, this.hoverColor, 
                this.unselectedColor, this.disabledColor, this.outlineColor, this.outlineWeight, this.fontColor, this.padding, this.borderStyle]

    revertToDefaultDescriptors: [
        {
            objectName: "rows"
            propertyName: "textSize"
        },
        {
            objectName: "rows"
            propertyName: "height"
        },
        {
            objectName: "rows"
            propertyName: "width"
        },
        {
            objectName: "rows"
            propertyName: "background"
        },
        {
            objectName: "rows"
            propertyName: "transparency"
        },
        {
            objectName: "rows"
            propertyName: "selectedColor"
        },
        {
            objectName: "rows"
            propertyName: "hoverColor"
        },
        {
            objectName: "rows"
            propertyName: "unselectedColor"
        },
        {
            objectName: "rows"
            propertyName: "disabledColor"
        },
        {
            objectName: "rows"
            propertyName: "outlineColor"
        },
        {
            objectName: "rows"
            propertyName: "outlineWeight"
        },
        {
            objectName: "rows"
            propertyName: "fontColor"
        },
        {
            objectName: "rows"
            propertyName: "padding"
        },
        {
            objectName: "rows"
            propertyName: "borderStyle"
        }
    ]
}

export class ImagesCardSettings extends Card {

    imageSplit = new formattingSettings.NumUpDown({
        name: "imageSplit",
        displayNameKey: "Visual_Images_Split",
        value: ImagesSplitSettings.DefaultValue,
        options: {
            minValue: {
                type: powerbiVisualsApi.visuals.ValidatorType.Min,
                value: ImagesSplitSettings.MinValue,
            },
            maxValue: {
                type: powerbiVisualsApi.visuals.ValidatorType.Max,
                value: ImagesSplitSettings.MaxValue,
            },
        }
    });

    imageRound = new formattingSettings.ToggleSwitch({
        name: "imageRound",
        displayNameKey: "Visual_Images_Round",
        value: false,
        topLevelToggle: false
    });

    stretchImage = new formattingSettings.ToggleSwitch({
        name: "stretchImage",
        displayNameKey: "Visual_Images_Stretch",
        value: false,
        topLevelToggle: false
    });

    bottomImage = new formattingSettings.ToggleSwitch({
        name: "bottomImage",
        displayNameKey: "Visual_Images_Bottom",
        value: false,
        topLevelToggle: false
    });

    name: string = "images";
    displayNameKey: string = "Visual_Images";
    slices = [this.imageSplit, this.imageRound, this.stretchImage, this.bottomImage];

    revertToDefaultDescriptors: [
        {
            objectName: "images"
            propertyName: "imageSplit"
        },
        {
            objectName: "images"
            propertyName: "imageRound"
        },
        {
            objectName: "images"
            propertyName: "stretchImage"
        },
        {
            objectName: "images"
            propertyName: "bottomImage"
        }
    ]
}

export class TooltipsCardSettings extends Card {

    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayNameKey: "Visual_Show",
        value: false,
        topLevelToggle: true
    });

    name: string = "tooltips";
    displayNameKey: string = "Visual_Tooltips";
    slices = [this.show];

    revertToDefaultDescriptors: [
        {
            objectName: "tooltips"
            propertyName: "show"
        }
    ]
}

export class SlicerItemContainer extends Card {
    public marginTop: number = 5;
    public marginLeft: number = 0;
}

export class Margin extends Card {
    public top: number = 50;
    public bottom: number = 50;
    public right: number = 50;
    public left: number = 50;
}

export class HeaderText extends Card {
    public marginTop: number = 5;
    public marginLeft: number = 0;
}

export class ChicletSlicerSettingsModel extends Model { 
    generalCardSettings = new GeneralCardSettings();
    headerCardSettings = new HeaderCardSettings();
    slicerTextCardSettings = new SlicerTextCardSettings();
    imagesCardSettings = new ImagesCardSettings();
    tooltipsCardSettings = new TooltipsCardSettings();
    slicerItemContainer = new SlicerItemContainer();
    margin = new Margin();
    headerText = new HeaderText();
    
    cards = [this.generalCardSettings, this.headerCardSettings, this.slicerTextCardSettings, this.imagesCardSettings, this.tooltipsCardSettings];

    setLocalizedOptions(localizationManager: ILocalizationManager) {
        this.setLocalizedDisplayName(borderStyleOptions, localizationManager);
        this.setLocalizedDisplayName(orientationOptions, localizationManager);
        this.setLocalizedDisplayName(outlineOptions, localizationManager);
        this.setLocalizedDisplayName(showDisabledOptions, localizationManager);
    }   

    public setLocalizedDisplayName(options: IEnumMember[], localizationManager: ILocalizationManager) {
        options.forEach(option => {
            option.displayName = localizationManager.getDisplayName(option.displayName.toString())
        });
    }
}