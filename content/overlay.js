/*
Copyright 2007 Security Compass

This file is part of SQL Inject Me.

Access Meis free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Access Meis distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with SQL Inject Me.  If not, see <http://www.gnu.org/licenses/>.

If you have any questions regarding Access Meplease contact
tools@securitycompass.com
*/


function AccessMeOverlay() {
    //dump('\nAccessMeOverlay::ctor()');
    var self = this;
    this.firstRun = true;
    this.tabSelectListener = function(event){ dump('\n' + event.target);
            dump('\n' + event.originalTarget);}
    
    /**
     * used to listen for requests
     */
    this.progressListener = new SecCompProgressListener(
            function(aRequest, aURI){self.gotRequest(aRequest, aURI)},
            Components.interfaces.nsIWebProgressListener.STATE_START,
            // we could use stop, but earlier is faster :grin:
            Components.interfaces.nsIWebProgressListener.STATE_IS_DOCUMENT |
            Components.interfaces.nsIWebProgressListener.STATE_IS_NETWORK |
            Components.interfaces.nsIWebProgressListener.STATE_IS_REQUEST |
            Components.interfaces.nsIWebProgressListener.STATE_IS_WINDOW);
    /**
     * used to listen for the data from the requests
     */
    this.rawResponseListener = null; 
    
    this.rawResponse = null;
    /* all these or's are because I'm not that sure which thing we're supposed
      to be listening on */
    this.browser = null;
    this.started = false;
    this.lastOperation = null;
    
    this.testManager = null;
}

AccessMeOverlay.prototype = {
    onLoad: function() {
        gBrowser.selectedBrowser.addProgressListener(this.progressListener,
                Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
        gBrowser.tabContainer.addEventListener('TabSelect', this.tabSelectListener, false);
        this.browser = gBrowser.selectedBrowser;
    }
    ,
    onUnload: function() {
        gBrowser.selectedBrowser.removeProgressListener(this.progressListener,
                Components.interfaces);
        gBrowser.tabContainer.removeEventListener('TabSelect',
                this.tabSelectListener, false);
    }
    ,
    runTest: function(){
        dump('\going to run test...');
        if (this.started === true && this.lastOperation !== null) {
            if (this.testManager === null) {
                this.testManager = getTestManager(this);
            }
            this.testManager.runTest(this.lastOperation)
        }
    }
    ,
    switchToPauseButton: function(){
        var caster = document.getElementById('accessme-action');
        caster.setAttribute('oncommand', 'accessMeOverlay.pause()');
        caster.setAttribute('label', 'Pause');
        
    }
    ,
    switchToStartButton: function(){
        var caster = document.getElementById('accessme-action');
        caster.setAttribute('oncommand', 'accessMeOverlay.start()');
        caster.setAttribute('label', 'Resume');
    }
    ,
    pause: function(){
        this.started = false;
        this.switchToStartButton();
    }
    ,
    start: function() {
        if (this.started === false) {
            this.started = true;
            this.switchToPauseButton();
            this.runTest();
        }
    }
    ,
    gotRequest: function (aRequest, aURI) {
        if (aURI.scheme !== 'http'){
            return; //we don't care about not http
        }
        var self = this;
        this.lastOperation = null;
        this.lastOperation = new Object();
        this.lastOperation.request = aRequest;
        this.lastOperation.uri = aURI;
        
        this.rawResponseListener = new StreamListener(
            function(streamListener){
                dump('\ngot raw data');
                self.lastOperation.rawResponse = streamListener.data;
                self.runTest();
            },
            null);
        
        var httpChannelCopy = cloneHttpChannel(aRequest);
        httpChannelCopy.asyncOpen(this.rawResponseListener, httpChannelCopy);
        
        dump('\nchanging lastOp' + aURI);
        
    }
    ,
    analyzeRequest: function (aWebProgress, aRequest, aFlag, aStatus) {
        
        var req = aRequest.QueryInterface(Components.interfaces.nsIRequest);
        var webProgress = aWebProgress.
                QueryInterface(Components.interfaces.nsIWebProgress);
        var get = req.name;
        var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                .getService(Components.interfaces.nsIIOService);
        var uri = ioService.newURI(req, null, null);
        
    }
    ,
    listenForRequests: function (browser) {
                
    }
    ,
    recordRequestParameters: function(aRequest) {

    }
    ,
    recordResponse: function(httpChannel) {
        
    }
    ,
    /**
     * Called when we have moved to a new page.
     * Doesn't take parameters because the data we need is only available in
     * the SessionHistory object anyway.
     */
    onNewPage: function(aNewURI) {
        //dump('\nGot a new page');
        var sessionHistory = getBrowser().selectedBrowser.sessionHistory.QueryInterface(Components.interfaces.nsISHistory);
        var webNav = sessionHistory.QueryInterface(Components.interfaces.nsIWebNavigation);
        var curEntry = sessionHistory.getEntryAtIndex(0, false);
        
        //dump(' title is:' + curEntry.title);
    }
    ,
    generatingReport: function() {
        // do nothing yet.
    }
    ,
    postTest: function() {
        // do nothing right now.
    }
    ,
    finishedTest: function() {

    }
    ,
    doneTestSet: function() {
                //do nothing right now.
        var resultState = getTestManager().resultsManager.state;
        
        if (resultState === ResultsManager.prototype.STATE_PASS) {
            this.displayPassState();
        }
        else {
            this.displayerErrorState();
        }
    }
    ,
    displayerErrorState: function(){
        var statusIcon = document.getElementById('accessme-test-status');
        statusIcon.className = 'error';
        statusIcon.label='Errors';
    }
    ,
    displayPassState: function(){
        var statusIcon = document.getElementById('accessme-test-status');
        statusIcon.className = 'pass';
        statusIcon.label='Passed';
        
    }
    ,
    showReport: function(){
        if (this.testManager != null &&
            this.testManager.resultsManager != null &&
            this.testManager.resultsManager.results != null)
        {
            this.testManager.resultsManager.showResults(this.testManager);
        }
        else {
            var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                        .getService(Components.interfaces.nsIPromptService);
            prompts.alert(null, "Can't Generate Reports", "Please start Access Me and run some tests before trying to view results.");
        }
    }
};

var accessMeOverlay = new AccessMeOverlay();

window.addEventListener('load', function(){accessMeOverlay.onLoad()}, false);
window.addEventListener('unload', function(){accessMeOverlay.onUnload()}, false);
