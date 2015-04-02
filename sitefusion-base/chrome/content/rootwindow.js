Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "gDevTools", "resource:///modules/devtools/gDevTools.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "gDevToolsBrowser", "resource:///modules/devtools/gDevTools.jsm");
XPCOMUtils.defineLazyGetter(this, "BrowserToolboxProcess", function() {
  let tmp = {};
  Cu.import("resource:///modules/devtools/ToolboxProcess.jsm", tmp);
  return tmp.BrowserToolboxProcess;
});

var debugSession = function() {
	BrowserToolboxProcess.init();
};