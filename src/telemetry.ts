import powerbi from "powerbi-visuals-api";
import VisualEventType = powerbi.VisualEventType;
import ITelemetryService = powerbi.extensibility.ITelemetryService;
import { ChicletSlicerDataPoint } from "./interfaces";

export class ExternalLinksTelemetry {
    private telemetry: ITelemetryService;
    private isTraced = false;

    constructor(telemetry: ITelemetryService) {
        this.telemetry = telemetry;
    }

    private traceDetected() {
        if (this.isTraced) {
            return;
        }
        this.telemetry.trace(VisualEventType.Trace, "External image link detected");
        this.isTraced = true;
    }

    public detectExternalImages(dataPoints: ChicletSlicerDataPoint[]): void {
        const hasExternalImageLink: boolean = dataPoints.some((dataPoint: ChicletSlicerDataPoint) => {
            return ExternalLinksTelemetry.containsExternalURL(dataPoint.imageURL)
        });

        if (hasExternalImageLink) {
            this.traceDetected();
        }
    }

    public static containsExternalURL(url: string | null): boolean {
        return /^(ftp|https|http):\/\/[^ "]+$/.test(url);
    }
}