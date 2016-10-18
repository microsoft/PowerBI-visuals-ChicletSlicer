powerbi.visuals.system.DebugVisual.prototype.enumerateObjectInstances = function (options) {
 if (this.adapter && this.adapter.enumerateObjectInstancesAsync) {
  return this.adapter.enumerateObjectInstancesAsync(options);
 }
 return [];
}
