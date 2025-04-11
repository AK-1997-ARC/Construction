document.addEventListener('wpcf7submit', function(event) {
    cf7GASendTrackingEvent(event.detail.contactFormId);
}, false );

/**
 * Send tracking data
 * @param {string} formId WP post ID for the CF7 form
 */
function cf7GASendTrackingEvent(formId) {
    var formLabel = window.location.href;

    // Global Site Tag (gtag.js)
    if ("ga" in window) {
        ga.getAll().forEach(function(tracker){
            tracker.send("event", "Contact Form", "Sent", formLabel);
        });
    } else if ( typeof gtag !== "undefined" ) {
        gtag( "event", "contact_form_7", {
            "event_category": "Contact Form 7",
            "event_action": "Sent",
            "event_label": formLabel
        });
    } else if ( typeof ga !== "undefined" ) {
        ga( "send", "event", "Contact Form", "Sent", formLabel );
    } else if ( typeof _gaq !== "undefined" ) {
        _gaq.push([ "_trackEvent", "Contact Form", "Sent", formLabel ]);
    } else if ( typeof __gaTracker !== "undefined" ) {
        __gaTracker( "send", "event", "Contact Form", "Sent", formLabel );
    }
}
