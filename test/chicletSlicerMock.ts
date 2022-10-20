import { ChicletSlicer } from "../src/chicletSlicer";

export interface SelectionState {
    items: string;
    state: boolean;
}

export class ChicletSlicerMock extends ChicletSlicer{

    protected override telemetryTrace(): void {
        this.externalImageTelemetryTraced();
    }
}