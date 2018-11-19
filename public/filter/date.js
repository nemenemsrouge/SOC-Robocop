import uiModules from 'ui/modules';
import moment from 'moment';

var modules = require('ui/modules');

if (!modules) {
  modules = require('ui/modules').uiModules;
}

modules.get('app/robocop')

// Display date on format lll of moment plugin
/**
 * @class angular_module.robocop.filter.moment
 * @description Filter that display date in local format. It use moment plugin with 'lll' argument.
 */
.filter('moment', function() {
  return function (dateString) {
    return moment(dateString).format('lll');
  };
})

//
/**
 * @class angular_module.robocop.filter.period
 * @description Filter that display period on format "xxhxx - xxhxx MTWTFSS" or "MTWTFSS"
 * @param {period} - Use the period of an alert/cron
 */
.filter('period', function() {
  return function (period) {
    try {
      if (period.type == 'wh') {
        return 'WH';
      } else if (period.type == 'nwh') {
        return 'NWH';
      } else {
        var result = '';

        let time = period.start;
        var h = Math.trunc(time / 100);
        if (h < 10) {
          h = '0' + h;
        }
        var min = time % 100;
        if (min < 10) {
          min = '0' + min;
        }
        if (h) {
          result += h + 'h' + min;
        }

        time = period.end;
        var h = Math.trunc(time / 100);
        if (h < 10) {
          h = '0' + h;
        }
        var min = time % 100;
        if (min < 10) {
          min = '0' + min;
        }
        if (h) {
          result += ' - ' + h + 'h' + min + ' ';
        }

        let days = period.days;
        var daysRef = ['M', 'T', 'W', 'T', 'F', 'S'];
        let withoutSunday =  days.slice(1, 7);
        for (var idDays in withoutSunday) {
          if (withoutSunday[idDays]) {
            result += '<strong class="text-success">' + daysRef[idDays] + '</strong>';
          } else {
            result += '<span class="text-danger">' + daysRef[idDays] + '</span>';
          }
        }
        //Sunday
        if (days[0]) {
          result += '<strong class="text-success">S</strong>';
        } else {
          result += '<span class="text-danger">S</span>';
        }
        return result;
      }
    } catch (e) {
      return 'error' + e;
    }
  };
});

