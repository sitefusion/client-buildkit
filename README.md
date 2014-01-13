
SiteFusion Client BuildKit (tailored for XULRunner 25.0.1)
----------------------------------------------------------------------------

This package allows you to build and brand custom SiteFusion clients, and
is used by SiteFusion.org to create the default SiteFusion.org branded
client.

Three shell scripts are included:

 + build [ windows | macosx | linux ]
       The build script composes the clients for the specified platform(s)
       from the component directories and builds the resulting base clients
       in the builds directory. When no platforms are specified, the script
       builds for all platforms. The result of this command is not yet
       useable as a standalone client because it is unbranded. Unbranded
       clients can however be used for the updater service, which brands
       clients on the fly, depending on the branding of the requesting
       client.

 + brand <vendor> <product>
       The brand script brands the base clients in the builds directory
       with the specified vendor and product name (and optionally a vendorURL). Note that both vendor
       and product need to be strings without spaces.

 + clear
       This script clears the builds directories


Example: the command to build and brand the SiteFusion.org branded
SiteFusion client for all three platforms is:

       ./build && ./brand SiteFusion.org SiteFusion http://www.sitefusion.org



Customization
----------------------------------------------------------------------------

Clients are built up from several components, reflected in the directories
contained in this package:

 + sitefusion-base : this directory contains the base contents of the
       SiteFusion-specific XULRunner directory contents that are the
       same across all platforms. This includes the chrome files in
       chrome/content, the base preferences in defaults/preferences,
       the style extensions in res and the application.ini file.

 + sitefusion-extended : this directory contains the platform-specific
       extensions of sitefusion-base. This includes stub executables,
       executable dependencies (gkmedias.dll on recent windows versions),
       icons, and README's.

 + sitefusion-root : this directory contains the platform-specific root
       application folder directory structures. Only MacOSX requires a
       base directory structure, which contains the Info.plist file and
       the stub executable. On Mac you need to include libmozglue.dylib
       next to the stub executable.

 + xulrunner-chrome : this directory contains additions to the chrome
       of the xulrunner. Additional language packs (.jar and .manifest)
       can be added here, the Dutch language pack is included by default.
       Note that language packs need to originate from a FireFox build
       of the exact same version as the included XULRunner build. 

 + xulrunner-res : this directory contains altered .css files that need
       to sit in the xulrunner/res directory. To ensure compatibility
       with future changes in the xulrunner/res files from Mozilla
       releases, only .patch files are processed and applied to the 
       corresponding release files in the xulrunner/res directory.

 + xulrunners : this directory contains the unpacked Mozilla XULRunner
       releases without any modifications. These can be replaced with
       a version of choice. Note that the base directory names are 
       platform specific and should be left the same. Linux needs to 
       supplied with both a 32bit and a 64bit clients.

