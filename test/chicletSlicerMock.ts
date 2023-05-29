import { ChicletSlicer } from "../src/chicletSlicer";

export interface SelectionState {
    items: string;
    state: boolean;
}

export class ChicletSlicerMock extends ChicletSlicer {
    protected telemetryTrace(): void {
        this.externalImageTelemetryTraced();
    }
}