var dateformat = require('dateformat')

/**
  ~~ Config ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/
var cfg = {
  'logFilesList': [],
  'logFilesListHTML': "",
  'lastSelectedLog': NaN,
  'pollFrequency': 100,
  'shownLog': {
    'id': 0, 'offset': 0, 'lines': 10 }
}

/**
  ~~ BorgBackup interaction ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/
var noBackupRunning = function (callback) {
  $.getJSON('/backup/status', function (resp) {
    var backupRunning = resp.rc === null
    if (backupRunning) log("▶ Backup in progress")
    else log("✖ No backup in progress")
    callback(!backupRunning)
  })
}
var pollBackupStatus = function (endpoint, ms, callback) {
  noBackupRunning(function (notRunning) {
    if (notRunning) {
      $('.navbar button[type=submit]').toggleClass('btn-success')
      $('.navbar button[type=submit]').toggleClass('btn-warning')
      $('.navbar button[type=submit]').text("▶ Start Backup")
      $.getJSON('/logs', updateLogFileList)
    } else {
      log("Polling backup status")
      $.getJSON('/backup/status', callback)
      setTimeout(ms, pollBackupStatus(endpoint, ms, callback))
    }
  })
}
var startBackup = function (force) {
  if (force) {
    log("Sending backup start request")
    $.post('/backup/start', {}, function () {
      $('.navbar button[type=submit]').toggleClass('btn-success')
      $('.navbar button[type=submit]').toggleClass('btn-warning')
      $('.navbar button[type=submit]').text("✖ Stop Backup")
      pollBackupStatus('/backup/status', cfg['pollFrequency'],
        function (res) {
          log("Received status update")
        }) })
  } else if (force === undefined) noBackupRunning(startBackup)
  else {
    log("Terminating (eventually killing) the backup process")
    $.post('/backup/stop', {}, function () {})
  }
}

/**
  ~~ Utility ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/
var log = function(){
  var args = Array.prototype.slice.call(arguments)
  var time = '[' + dateformat(new Date(), 'HH:MM:ss') + ']'
  args.unshift(time)
  console.log.apply(console, args);
  return this
}
var isInt = function (n) {
  return n % 1 === 0
}
var success = function (data) {
  logFiles = data.log_files
}
var parseAnchor = function () {
  var url = window.location.href.toString()
  var idx = url.indexOf("#")
  var anchor = (idx != -1) ? url.substring(idx+1) : ""
  if (anchor) {
    var parts = anchor.split(';')
    var partsParsed = {}
    parts.forEach(function (e) {
      var pair = e.split(':')
      partsParsed[pair[0]] = pair[1]
    })
    return partsParsed
  } else return {'log': 0}
}

/**
  ~~ UI updaters ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/
var updateLogFileList = function (logFiles) {
  log("Updating log file list")
  cfg.logFilesListHTML = []
  $.each(logFiles.log_files, function (key, value) {
    cfg.logFilesListHTML += '<li><a href="#log:' + value[0]
      + '" onClick="window.displayThatLog('
      + value[0] + ')">' + value[1] + '</a></li>'})
  $('#log-files').html(cfg.logFilesListHTML)
}
var appendLog = function (data) {
  log("Rendering: " + data.fname)
  var logText = $('#log-text')
  data.lines.forEach(function (val, index) { logText.append(val + '\n') })
  $('#loadMore').remove()
  cfg['shownLog']['offset'] = data.offset
  logText.after('<button id="loadMore" onClick="window.showLog('
    + cfg['shownLog']['id'] + ', ' + cfg['shownLog']['offset'] + ', '
    + cfg['shownLog']['lines'] + ')">load more</button>' )
}
var showLog = function (id, offset, lines) {
  if (arguments.length === 1) {
    $('#log-text').html('')
    cfg['shownLog']['offset'] = 0 }
  cfg['shownLog']['id'] = id || cfg['shownLog']['id']
  cfg['shownLog']['offset'] = offset || cfg['shownLog']['offset']
  cfg['shownLog']['lines'] = lines || cfg['shownLog']['lines']
  var url = '/logs/' + cfg['shownLog']['id'] + '/' + cfg['shownLog']['offset']
    + ':' + cfg['shownLog']['lines']
  log("Fetching log (" + cfg['shownLog']['id'] + ', '
    + cfg['shownLog']['offset'] + ', ' + cfg['shownLog']['lines'] + ')')
  $.getJSON(url, appendLog)
}

/**
  ~~ UI callables ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/
window.displayThatLog = function (that) {
  showLog(that)
}
window.startBackup = startBackup
window.showLog = showLog
/**
  ~~ Site init ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/
$.getJSON('/logs', updateLogFileList)
showLog()






