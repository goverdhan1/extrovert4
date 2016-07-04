using System.Web;
using System.Web.Optimization;

namespace Deloitte.TOD.TalentAnalyticsSite
{
    public class BundleConfig
    {
        public static void RegisterBundles(BundleCollection bundles)
        {
            bundles.IgnoreList.Ignore("*.tests.js");

            bundles.Add(new ScriptBundle("~/bundles/vendors").Include(
                "~/Scripts/angular.js",
                "~/Scripts/jquery.ui.touch-punch.min.js",
                "~/Scripts/angular-ui-router.js",
                "~/Scripts/angular-resource.js",
                "~/Scripts/angular-cookies.js",
                "~/Scripts/angular-animate.min.js",
                 "~/Scripts/jquery-ui-1.10.3.js",
                 "~/Scripts/jquery.dataTables.min.js",
                 "~/Scripts/ui-bootstrap-tpls-0.6.0.js",
                 "~/Scripts/toaster.min.js",                 
                 "~/Scripts/FileSaver.js"  

            ));

            var applicationJSCodeBundle = new ScriptBundle("~/bundles/app").IncludeDirectory("~/App/", "*.js", true);
            applicationJSCodeBundle.Transforms.Clear();
            bundles.Add(applicationJSCodeBundle);

            bundles.Add(new ScriptBundle("~/bundles/vendorGraphs").Include(
              "~/Scripts/raphael-min.js",
                "~/Scripts/d3.min.js",
                "~/Scripts/nv.d3.js"
           ));

            bundles.Add(new StyleBundle("~/bundles/vendorstyles").Include(
                "~/App/core/styles/bootstrap.min.css"                
            ));
            bundles.Add(new StyleBundle("~/bundles/allpageStyles").Include(
             "~/App/header/styles/header.min.css",
             "~/App/header/styles/top.header.min.css",
             "~/App/styles/styles.css"
               
         
           ));
            bundles.Add(new StyleBundle("~/bundles/commonStyles").Include(
               "~/App/core/styles/empqvcommon.min.css",
               "~/App/core/directives/preloader/preloader.min.css"
           ));
            bundles.Add(new StyleBundle("~/bundles/rateAppStyles").Include(
               "~/App/rateThisApp/styles/rate-this-app.min.css"
           ));

        }
    }
}