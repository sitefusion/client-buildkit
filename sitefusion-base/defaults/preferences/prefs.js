// Leave this line intact
pref("toolkit.defaultChromeURI", "chrome://sitefusion/content/startup.xul");

pref("app.releaseNotesURL", "http://www.sitefusion.org/");

pref("sitefusion.defaultLoginWindowURI","chrome://sitefusion/content/login.xul");
pref("sitefusion.defaultRootWindowURI","chrome://sitefusion/content/rootwindow.xul");
pref("sitefusion.defaultChildWindowURI","chrome://sitefusion/content/childwindow.xul");
pref("sitefusion.defaultPrefWindowURI","chrome://sitefusion/content/prefwindow.xul");
pref("sitefusion.defaultDialogURI","chrome://sitefusion/content/dialog.xul");

// Set this if you want to force an address setting and hide the input box
//pref("sitefusion.forceLogin.address","http://ip/sitefusion");
// Set this if you want to force an application setting and hide the input box
//pref("sitefusion.forceLogin.application","sitefusion/admin");
// Set this if you want to force an arguments setting and hide the input box
//pref("sitefusion.forceLogin.arguments","");
// Set this if you want to force a username setting and hide the input box
//pref("sitefusion.forceLogin.username","user");
// Set this if you want to force a password setting and hide the input box
//pref("sitefusion.forceLogin.password","password");

pref("javascript.options.jit.chrome", true);
pref("javascript.options.jit.content", true);

pref("network.protocol-handler.expose.http", false);
pref("network.protocol-handler.warn-external.http", false);

pref("network.protocol-handler.expose.mailto", false);
pref("network.protocol-handler.warn-external.mailto", false);

pref("browser.dom.window.dump.enabled", true);
pref("javascript.options.showInConsole", true);
pref("javascript.options.strict", false);
pref("nglayout.debug.disable_xul_cache", false);
pref("nglayout.debug.disable_xul_fastload", false);

user_pref("app.update.log.Checker", true);
user_pref("app.update.log.Downloader", true);
user_pref("app.update.log.General", true);
user_pref("app.update.log.UI:CheckingPage", true);
user_pref("app.update.log.UI:DownloadingPage", true);
user_pref("app.update.log.UI:LicensePage", true);
user_pref("app.update.log.UpdateManager", true);
user_pref("app.update.log.UpdateService", true);

/* application update prefs */
pref("app.update.channel", "default");
pref("app.update.enabled", true);
pref("app.update.auto", true); // auto download updates
pref("app.update.mode", 1); // prompt for incompatible add-ons
pref("app.update.url.manual", "http://www.sitefusion.org/update/manual");
pref("app.update.url.details", "http://www.sitefusion.org/update/details");
pref("app.update.interval", 86400); // check once a day
pref("app.update.nagTimer.download", 86400);
pref("app.update.nagTimer.restart", 600);
pref("app.update.timer", 60000); // 1 minute
pref("app.update.showInstalledUI", false); // broken?


pref("extensions.update.enabled", true);
pref("extensions.dss.switchPending", false);
pref("extensions.update.url", "https://www.sitefusion.org/-1/phpblock/update_extensions.rdf?reqVersion=%REQ_VERSION%&id=%ITEM_ID%&version=%ITEM_VERSION%&maxAppVersion=%ITEM_MAXAPPVERSION%&status=%ITEM_STATUS%&appID=%APP_ID%&appVersion=%APP_VERSION%&appOS=%APP_OS%&appABI=%APP_ABI%&locale=%APP_LOCALE%&currentAppVersion=%CURRENT_APP_VERSION%&updateType=%UPDATE_TYPE%");
pref("extensions.update.interval", 86400);  // Check for updates to Extensions and Themes every day
pref("extensions.getMoreExtensionsURL", "http://www.sitefusion.org/extensions");
pref("extensions.getMorePluginsURL", "http://www.sitefusion.org/plugins");
pref("extensions.webservice.discoverURL", "http://sitefusion.org/addonmanager");

pref("extensions.getAddons.cache.enabled", true);
pref("extensions.getAddons.maxResults", 15);
pref("extensions.getAddons.get.url", false);
pref("extensions.getAddons.search.browseURL", false);
pref("extensions.getAddons.search.url", false);

pref("extensions.getAddons.cache.enabled",false);
pref("extensions.blocklist.url",false);
pref("extensions.logging.enabled",false);
pref("javascript.options.showInConsole",true);
pref("nglayout.debug.disable_xul_cache",false);
pref("browser.dom.window.dump.enabled",true);
pref("general.warnOnAboutConfig",false);
pref("breakpad.reportURL","http://crash-stats.mozilla.com/report/index/");
pref("app.support.baseURL","http://www.sitefusion.org/");