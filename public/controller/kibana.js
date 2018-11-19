var modules = require('ui/modules');

if (!modules) {
  modules = require('ui/modules').uiModules
}

modules.get('app/robocop')
/**
 * @class angular_module.robocop.controller.robocopKibanaUiController
 * @description Controller for kibana tab.
 */
.controller("robocopKibanaUiController", function() {
    //TAB ACTION
    'use strict';

    var $tabs = $('.kuiTab');
    var $selectedTab = undefined;


    /**
     * @function selectTab
     * @memberof angular_module.robocop.controller.robocopKibanaUiController
     * @description Change class for selected tab.
     * @param {event.target} tab - tab selected.
     */
    function selectTab(tab) {
        if ($selectedTab) {
            $selectedTab.removeClass('kuiTab-isSelected');
        }

        $selectedTab = $(tab);
        $selectedTab.addClass('kuiTab-isSelected');

    }

    $tabs.on('click', function (event) {
        selectTab(event.target);
    });
    selectTab($tabs[0]);
})
