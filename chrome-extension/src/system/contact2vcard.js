// Copyright (c) 2012 Barnesandnoble.com, llc, Donavon West, and Domenic Denicola
//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: This is an import of the NobleJS setImmediate() polyfill located here:
//
//         https://github.com/NobleJS/setImmediate
//
//       It has been customized in the following ways:
//
//         1) Non-gecko browser compatibility code has been removed.  The
//            postMessage() implementation is always used, except for
//            web workers.  There we use setTimeout(0) since MessageChannel
//            is not implemented in gecko yet.  (Bug 911972)
//         2) The support for executing strings with eval() has been
//            disabled and will now throw an exception.
//         3) Convert test code to use suite() and test().
//
//       The style of this code is different from the rest of gaia, but
//       we chose to minimize non-functional changes in order to make
//       importing fixes from upstream easier in the future.
//
// XXX: Remove this file if/when bug 686201 land.

(function (global) {
    "use strict";

    var tasks = (function () {
        function Task(handler, args) {
            if (typeof handler !== "function") {
                throw new Error("setImmediate() handler must be a function; eval not supported");
            }
            this.handler = handler;
            this.args = args;
        }
        Task.prototype.run = function () {
            // Choice of `thisArg` is not in the setImmediate spec; `undefined` is in the setTimeout spec though:
            // http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html
            this.handler.apply(undefined, this.args);
        };

        var nextHandle = 1; // Spec says greater than zero
        var tasksByHandle = {};
        var currentlyRunningATask = false;

        return {
            addFromSetImmediateArguments: function (args) {
                var handler = args[0];
                var argsToHandle = Array.prototype.slice.call(args, 1);
                var task = new Task(handler, argsToHandle);

                var thisHandle = nextHandle++;
                tasksByHandle[thisHandle] = task;
                return thisHandle;
            },
            runIfPresent: function (handle) {
                // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
                // So if we're currently running a task, we'll need to delay this invocation.
                if (!currentlyRunningATask) {
                    var task = tasksByHandle[handle];
                    if (task) {
                        currentlyRunningATask = true;
                        try {
                            task.run();
                        } finally {
                            delete tasksByHandle[handle];
                            currentlyRunningATask = false;
                        }
                    }
                } else {
                    // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
                    // "too much recursion" error.
                    global.setTimeout(function () {
                        tasks.runIfPresent(handle);
                    }, 0);
                }
            },
            remove: function (handle) {
                delete tasksByHandle[handle];
            }
        };
    }());

    function canUsePostMessage() {
        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
        // where `global.postMessage` means something completely different and can't be used for this purpose.

        // NOTE: removed async test since it will always pass on gecko

        return global.postMessage && !global.importScripts;
    }

    function installPostMessageImplementation(attachTo) {
        // Installs an event handler on `global` for the `message` event: see
        // * https://developer.mozilla.org/en/DOM/global.postMessage
        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

        var MESSAGE_PREFIX = "com.bn.NobleJS.setImmediate" + Math.random();

        function isStringAndStartsWith(string, putativeStart) {
            return typeof string === "string" && string.substring(0, putativeStart.length) === putativeStart;
        }

        function onGlobalMessage(event) {
            // This will catch all incoming messages (even from other globals!), so we need to try reasonably hard to
            // avoid letting anyone else trick us into firing off. We test the origin is still this global, and that a
            // (randomly generated) unpredictable identifying prefix is present.
            if (event.source === global && isStringAndStartsWith(event.data, MESSAGE_PREFIX)) {
                var handle = event.data.substring(MESSAGE_PREFIX.length);
                tasks.runIfPresent(handle);
            }
        }
        global.addEventListener("message", onGlobalMessage, false);

        attachTo.setImmediate = function () {
            var handle = tasks.addFromSetImmediateArguments(arguments);

            // Make `global` post a message to itself with the handle and identifying prefix, thus asynchronously
            // invoking our onGlobalMessage listener above.
            global.postMessage(MESSAGE_PREFIX + handle, "*");

            return handle;
        };
    }

    function installSetTimeoutImplementation(attachTo) {
        attachTo.setImmediate = function () {
            var handle = tasks.addFromSetImmediateArguments(arguments);

            global.setTimeout(function () {
                tasks.runIfPresent(handle);
            }, 0);

            return handle;
        };
    }

    if (!global.setImmediate) {
        // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
        var attachTo = typeof Object.getPrototypeOf === "function" && "setTimeout" in Object.getPrototypeOf(global) ?
                          Object.getPrototypeOf(global)
                        : global;

        if (canUsePostMessage()) {
            // For non-IE10 modern browsers
            installPostMessageImplementation(attachTo);
        } else {
            // NOTE: fallback for web workers in gecko
            // XXX: replace with MessageChannel impl after bug 911972 lands
            installSetTimeoutImplementation(attachTo);
        }

        attachTo.clearImmediate = tasks.remove;
    }
}(this));


'use strict';

/**
 * text_normalizer.js: a basic string normalizer library that provides various
 *                     methods to normalize strings of characters
 *
 * The following methods are available:
 *    toAscii(string): convert strings containing accented-form characters to
 *                     their ASCII equivalent
 *
 *    escapeHTML(string, boolean): escape HTML tags
 *    escapeRegExp(string): escape regular expressions
 */
var Normalizer = {
  /**
   * Initialize the ASCII normalizer
   */
  initAsciiNormalizer: function normalizer_init() {
    // Map from lowercase ASCII to all known accented forms of the letter
    var equivalentChars = {
      'a': 'áăǎâäȧạȁàảȃāąåḁⱥãǽǣæ',
      'A': 'ÁĂǍÂÄȦẠȀÀẢȂĀĄÅḀȺÃǼǢÆ',
      'b': 'ḃḅɓḇƀƃ',
      'B': 'ḂḄƁḆɃƂ',
      'c': 'ćčçĉċƈȼ',
      'C': 'ĆČÇĈĊƇȻ',
      'd': 'ďḑḓḋḍɗḏđƌð',
      'D': 'ĎḐḒḊḌƊḎĐƋ',
      'e': 'éĕěȩêḙëėẹȅèẻȇēę',
      'E': 'ÉĔĚȨÊḘËĖẸȄÈẺȆĒĘ',
      'f': 'ḟƒ',
      'F': 'ḞƑ',
      'g': 'ǵğǧģĝġɠḡǥ',
      'G': 'ǴĞǦĢĜĠƓḠǤ',
      'h': 'ḫȟḩĥⱨḧḣḥħ',
      'H': 'ḪȞḨĤⱧḦḢḤĦ',
      'i': 'íĭǐîïịȉìỉȋīįɨĩḭı',
      'I': 'ÍĬǏÎÏỊȈÌỈȊĪĮƗĨḬ',
      'j': 'ĵɉ',
      'J': 'ĴɈ',
      'k': 'ḱǩķⱪꝃḳƙḵꝁ',
      'K': 'ḰǨĶⱩꝂḲƘḴꝀ',
      'l': 'ĺƚľļḽḷⱡꝉḻŀɫł',
      'L': 'ĹȽĽĻḼḶⱠꝈḺĿⱢŁ',
      'm': 'ḿṁṃɱ',
      'M': 'ḾṀṂⱮ',
      'n': 'ńňņṋṅṇǹɲṉƞñ',
      'N': 'ŃŇŅṊṄṆǸƝṈȠÑ',
      'o': 'óŏǒôöȯọőȍòỏơȏꝋꝍōǫøõœ',
      'O': 'ÓŎǑÔÖȮỌŐȌÒỎƠȎꝊꝌŌǪØÕŒ',
      'p': 'ṕṗꝓƥᵽꝑ',
      'P': 'ṔṖꝒƤⱣꝐ',
      'q': 'ꝗ',
      'Q': 'Ꝗ',
      'r': 'ŕřŗṙṛȑȓṟɍɽ',
      'R': 'ŔŘŖṘṚȐȒṞɌⱤ',
      's': 'śšşŝșṡṣß$',
      'S': 'ŚŠŞŜȘṠṢ',
      't': 'ťţṱțⱦṫṭƭṯʈŧ',
      'T': 'ŤŢṰȚȾṪṬƬṮƮŦ',
      'u': 'úŭǔûṷüṳụűȕùủưȗūųůũṵ',
      'U': 'ÚŬǓÛṶÜṲỤŰȔÙỦƯȖŪŲŮŨṴ',
      'v': 'ṿʋṽ',
      'V': 'ṾƲṼ',
      'w': 'ẃŵẅẇẉẁⱳ',
      'W': 'ẂŴẄẆẈẀⱲ',
      'x': 'ẍẋ',
      'X': 'ẌẊ',
      'y': 'ýŷÿẏỵỳƴỷỿȳɏỹ',
      'Y': 'ÝŶŸẎỴỲƳỶỾȲɎỸ',
      'z': 'źžẑⱬżẓȥẕƶ',
      'Z': 'ŹŽẐⱫŻẒȤẔƵ'
    };
    // Create the reverse map (i.e. the accented chars to their ASCII
    // equivalent) and build the regexp string
    this._toAsciiForm = {};
    for (var letter in equivalentChars) {
      var accentedForms = equivalentChars[letter];
      for (var i = accentedForms.length - 1; i >= 0; i--) {
        this._toAsciiForm[accentedForms[i]] = letter;
      }
    }
  },

  /**
   * Convert a string of characters to its ASCII equivalent
   * @param {string} str a string of characters.
   * @return {string} the normalized (ASCII) string in lower case.
   */
  toAscii: function normalizer_toAscii(str) {
    if (!str || typeof str != 'string') {
      return '';
    }

    if (!this._toAsciiForm) {
      Normalizer.initAsciiNormalizer();
    }

    // Convert accented form to ASCII equivalent
    var result = '';
    for (var i = 0, len = str.length; i < len; i++) {
      result += this._toAsciiForm[str.charAt(i)] || str.charAt(i);
    }

    return result;
  },

  /**
   * Escape HTML tags in a string of characters
   * @param {string} str a string of characters.
   * @param {boolean} escapeQuotes (optional) escape quotes.
   * @return {string} the HTML-escaped string.
   */
  escapeHTML: function normalizer_escapeHTML(str, escapeQuotes) {
    if (Array.isArray(str)) {
      return Normalizer.escapeHTML(str.join(' '), escapeQuotes);
    }

    if (!str || typeof str != 'string') {
      return '';
    }

    var escaped = str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
                     .replace(/>/g, '&gt;');
    if (escapeQuotes) {
      return escaped.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
    }
    return escaped;
  },

  /**
   * Escape regular expressions in a string of characters
   * @param {string} str a string of characters.
   * @return {string} the regexp-escaped string.
   */
  escapeRegExp: function normalizer_escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
  }
};

/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* globals setImmediate, Normalizer */

/**
 * ContactToVcard provides the functionality necessary to export from
 * MozContacts to vCard 3.0 (https://www.ietf.org/rfc/rfc2426.txt). The reason
 * to choose the 3.0 standard instead of the 4.0 one is that some systems
 * most notoriously Android 4.x don't seem to be able to import vCard 4.0.
 */
(function(exports) {
  'use strict';

  /** Mapping between contact fields and equivalent vCard fields */
  var VCARD_MAP = {
    'fax' : 'FAX',
    'faxoffice' : 'FAX,WORK',
    'faxhome' : 'FAX,HOME',
    'faxother' : 'FAX',
    'home' : 'HOME',
    'mobile' : 'CELL',
    'pager' : 'PAGER',
    'personal' : 'HOME',
    'pref' : 'PREF',
    'text' : 'TEXT',
    'textphone' : 'TEXTPHONE',
    'voice' : 'VOICE',
    'work' : 'WORK'
  };

  var CRLF = '\r\n';

  /** Field list to be skipped when converting to vCard */
  var VCARD_SKIP_FIELD = ['fb_profile_photo'];
  var VCARD_VERSION = '3.0';
  var HEADER = 'BEGIN:VCARD' + CRLF + 'VERSION:' + VCARD_VERSION + CRLF;
  var FOOTER = 'END:VCARD' + CRLF;

  function blobToBase64(blob, cb) {
    var reader = new FileReader();

    reader.onload = function() {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      cb(base64);
    };

    reader.readAsDataURL(blob);
  }

  function ISODateString(d) {
    if (typeof d === 'string') {
      d = new Date(d);
    }

    var str = d.toISOString();

    // Remove the milliseconds field
    return str.slice(0, str.indexOf('.')) + 'Z';
  }

  /**
   * Given an array with contact fields (usually containing only one field),
   * returns the equivalent vcard field
   *
   * @param {Array} sourceField source field from a MozContact
   * @param {String} vcardField vCard field name
   * @return {Array} Array of vCard string entries
   */
  function fromContactField(sourceField, vcardField) {
    if (!sourceField || !sourceField.length) {
      return [];
    }

    // Goes to the entries in the given field (usually only one but potentially
    // more) and transforms them into string-based, vCard ones.
    return sourceField.map(function(field) {
      var str = vcardField;
      /**
       * If the field doesn't have an equivalent in vcard standard.
       * Incompatible fields are stored in `VCARD_SKIP_FIELD`.
       *
       * @type {boolean}
       */
      var skipField = false;
      var types = [];

      // Checks existing types and converts them to vcard types if necessary
      // and fill `types` array with the final types.
      if (Array.isArray(field.type)) {
        var fieldType = field.type.map(function(aType) {
          var out = '';
          if (aType) {
            aType = aType.trim().toLowerCase();
            if (VCARD_SKIP_FIELD.indexOf(aType) !== -1) {
              skipField = true;
            }
            out = VCARD_MAP[aType] || aType;
          }
          return out;
        });

        types = types.concat(fieldType);
      }

      if (skipField) {
        return;
      }

      if (field.pref && field.pref === true) {
        types.push('PREF');
      }

      if (types.length) {
        str += ';TYPE=' + types.join(',');
      }

      return str + ':' + (field.value || '');
    });
  }

  function fromStringArray(sourceField, vcardField) {
    if (!sourceField) {
      return '';
    }

    return vcardField + ':' + sourceField.join(',');
  }

  function joinFields(fields) {
    return fields.filter(function(f) { return !!f; }).join(CRLF);
  }

  function toBlob(vcard, type) {
    return new Blob([vcard], {'type': type});
  }

  /**
   * Convenience function that converts an array of contacts into a text/vcard
   * blob. The blob is passed to the callback once the conversion is done.
   *
   * @param {Array} contacts An array of mozContact objects.
   * @param {Function} callback A function invoked with the generated blob.
   */
  function ContactToVcardBlob(contacts, callback, options) {
    var targetType = options && options.type || 'text/vcard';
    if(targetType.indexOf('charset') === -1) {
      targetType += '; charset=utf-8';
    }

    if (typeof callback !== 'function') {
      throw Error('callback() is undefined or not a function');
    }

    var str = '';

    ContactToVcard(contacts, function append(vcards, nCards) {
      str += vcards;
    }, function success() {
      str = str ? toBlob(str) : null;
      callback(toBlob(str, targetType));
    });
  }

  /**
   * Converts an array of contacts to a string of vCards. The conversion is
   * done in batches. For every batch the append callback is invoked with a
   * string of vCards and the number of contacts in the batch. Once all
   * contacts have been processed the success callback is invoked.
   *
   * @param {Array} contacts An array of mozContact objects.
   * @param {Function} append A function taking two parameters, the first one
   *        will be passed a string of vCards and the second an integer
   *        representing the number of contacts in the string.
   * @param {Function} success A function with no parameters that will be
   *        invoked once all the contacts have been processed.
   * @param {Number} batchSize An optional parameter specifying the maximum
   *        number of characters that should be added to the output string
   *        before invoking the append callback. If this paramter is not
   *        provided a default value of 1MiB will be used instead.
   */
  function ContactToVcard(contacts, append, success, batchSize, skipPhoto) {
    var vCardsString = '';
    var nextIndex = 0;
    var cardsInBatch = 0;

    batchSize = batchSize || (1024 * 1024);

    if (typeof append !== 'function') {
      throw Error('append() is undefined or not a function');
    }

    if (typeof success !== 'function') {
      throw Error('append() is undefined or not a function');
    }

    /**
     * Append the vCard obtained by converting the contact to the string of
     * vCards and if necessary pass the string to the user-specified callback
     * function. If we're not done processing all the contacts start processing
     * the following one.
     *
     * @param {String} vcard The string obtained from the previously processed
     *        contact.
     */
    function appendVCard(vcard) {
      if (vcard.length > 0) {
        vCardsString += HEADER + vcard + CRLF + FOOTER;
      }

      nextIndex++;
      cardsInBatch++;

      /* Invoke the user-provided callback if we've filled the current batch or
       * if we don't have more contacts to process. */
      if ((vCardsString.length > batchSize) ||
          (nextIndex === contacts.length)) {
        append(vCardsString, cardsInBatch);
        cardsInBatch = 0;
        vCardsString = '';
      }

      if (nextIndex < contacts.length) {
        processContact(contacts[nextIndex]);
      } else {
        success();
      }
    }

    /**
     * Process a contact and invokes appendVCard with the resulting vCard
     * string.
     *
     * @param {Object} contacts A mozContact object.
     */
    function processContact(ct) {
      //if (navigator.mozContact && !(ct instanceof navigator.mozContact)) {
      //  console.error('An instance of mozContact was expected');
      //  setImmediate(function() { appendVCard(''); });
      //  return;
      //}

      /*
       * N TYPE
       * The structured type value corresponds, in
       * sequence, to the Family Name, Given Name, Additional Names, Honorific
       * Prefixes, and Honorific Suffixes. The text components are separated
       * by the SEMI-COLON character (ASCII decimal 59). Individual text
       * components can include multiple text values (e.g., multiple
       * Additional Names) separated by the COMMA character (ASCII decimal
       * 44). This type is based on the semantics of the X.520 individual name
       * attributes. The property MUST be present in the vCard object.
       **/
      var n = 'n:' + ([
        ct.familyName,
        ct.givenName,
        ct.additionalName,
        ct.honorificPrefix,
        ct.honorificSuffix
      ].map(function(f) {
        f = f || [''];
        return f.join(',') + ';';
      }).join(''));

      // vCard standard does not accept contacts without 'n' or 'fn' fields.
      if (n === 'n:;;;;;' || !ct.name) {
        setImmediate(function() { appendVCard(''); });
        return;
      }

      var allFields = [
        n,
        fromStringArray(ct.name, 'FN'),
        fromStringArray(ct.nickname, 'NICKNAME'),
        fromStringArray(ct.category, 'CATEGORY'),
        fromStringArray(ct.org, 'ORG'),
        fromStringArray(ct.jobTitle, 'TITLE'),
        fromStringArray(ct.note, 'NOTE'),
        fromStringArray(ct.key, 'KEY')
      ];

      if (ct.bday) {
        allFields.push('BDAY:' + ISODateString(ct.bday));
      }
      if (ct.anniversary) {
        allFields.push('ANNIVERSARY:' + ISODateString(ct.anniversary));
      }

      allFields.push.apply(allFields, fromContactField(ct.email, 'EMAIL'));
      allFields.push.apply(allFields, fromContactField(ct.url, 'URL'));
      allFields.push.apply(allFields, fromContactField(ct.tel, 'TEL'));

      var adrs = fromContactField(ct.adr, 'ADR');
      allFields.push.apply(allFields, adrs.map(function(adrStr, i) {
        var orig = ct.adr[i];
        return adrStr + ([
          '',
          '',
          orig.streetAddress || '', orig.locality || '', orig.region || '',
          orig.postalCode || '', orig.countryName || ''].join(';'));
      }));

      /**
       * PHOTO TYPE
       * The encoding MUST be reset to "b" using the ENCODING
       * parameter in order to specify inline, encoded binary data. If the
       * value is referenced by a URI value, then the default encoding of 8bit
       * is used and no explicit ENCODING parameter is needed.

       * Type value: A single value. The default is binary value. It can also
       * be reset to uri value. The uri value can be used to specify a value
       * outside of this MIME entity.

       * Type special notes: The type can include the type parameter "TYPE" to
       * specify the graphic image format type. The TYPE parameter values MUST
       * be one of the IANA registered image formats or a non-standard image
       * format.
      */
      if (
        (
          typeof skipPhoto == 'undefined' ||
          skipPhoto === false
        ) &&
        ct.photo &&
        ct.photo.length
      ) {
        var photoMeta = ['PHOTO', 'ENCODING=b'];
        var blob = ct.photo[0];

        blobToBase64(blob, function(b64) {
          if (blob.type) {
            photoMeta.push('TYPE=' + blob.type);
          }
          allFields.push(photoMeta.join(';') + ':' + b64);
          appendVCard(joinFields(allFields));
        });
      } else {
        setImmediate(function() { appendVCard(joinFields(allFields)); });
      }
    }

    processContact(contacts[0]);
  }

  // Generates a name for the contact returned as a vcard
  function getVcardFilename(theContact) {
    var out = '';

    var givenName = Array.isArray(theContact.givenName) &&
                                                      theContact.givenName[0];
    var familyName = Array.isArray(theContact.familyName) &&
                                                      theContact.familyName[0];

    if (givenName) {
      out = givenName;
    }

    if (familyName) {
      if (out) {
        out += '_';
      }
      out += familyName;
    }

    out = out || (Array.isArray(theContact.org) && theContact.org[0]);

    out = out || (Array.isArray(theContact.tel) && theContact.tel[0] &&
                 ( 'c' + '_' + theContact.tel[0].value) );

    out = out || (Array.isArray(theContact.email) && theContact.email[0] &&
                  theContact.email[0].value);

    out = Normalizer.toAscii(out).replace(/[\s+@#&?\+\$]/g, '');

    if (out) {
      return Promise.resolve(out + '.vcf');
    }
    return Promise.resolve('noName.vcf');
    //return navigator.mozL10n.formatValue('noName').then(name => name + '.vcf');
  }

  exports.ContactToVcard = ContactToVcard;
  exports.ContactToVcardBlob = ContactToVcardBlob;
  exports.VcardFilename  = getVcardFilename;
})(this);
