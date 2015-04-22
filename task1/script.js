var db;

$(document).on("pageinit", "#page-home", function () {
    var datetime = $('#mydate2');
    var datetime1 = $('#mydate3');
    var title = $('#title');
    var desc = $('#desc');
    var repeat = $('#repeat');

    var splitdatetime = null;
    var date = null;
    var time = null;

    db = window.openDatabase("reminder", "1.0", "reminder db", 1024 * 1024);
    var eService = {
        extractEntities: function (rs) {
            var entities = [];
            for (var i = 0; i < rs.rows.length; i++) {
                entities.push(rs.rows.item(i));
            }
            return entities;
        },
        dHandler: function (func) {
            var that = this;
            return function (tx, rs) {
                func(that.extractEntities(rs));
            }
        },
        dSuccessHandler: function () {
            console.log("success");
            console.log(arguments);
        },
        dFailureHandler: function (tx, err) {
            console.log("failed");
            console.log(arguments);
        },
        init: function () {
            db.transaction(function (tx) {
                //tx.executeSql('DROP TABLE events;', []);
                tx.executeSql('CREATE TABLE IF NOT EXISTS events (date DATE, time TEXT, title TEXT, desc TEXT, rep DATE)', []);
            }, this.dFailureHandler, this.dSuccessHandler);
        },
        findAll: function (dataHandler, successHandler, failureHandler) {
            var that = this;
            db.transaction(function (tx) {
                tx.executeSql("SELECT * FROM events ORDER BY DATE;", [], function (tx, rs) {
                    dataHandler(that.extractEntities(rs));
                });
            }, (failureHandler || that.dFailureHandler), (successHandler || that.dSuccessHandler));
        },
        findByTitle: function (title, dataHandler, successHandler, failureHandler) {
            var that = this;
            db.transaction(function (tx) {
                tx.executeSql("select * from events where title= ?;", [title], function (tx, rs) {
                    dataHandler(that.extractEntities(rs));
                });
            }, (failureHandler || that.dFailureHandler), (successHandler || that.dSuccessHandler));
        },
        findByDate: function (date, dataHandler, successHandler, failureHandler) {
            var that = this;
            var todayStart = new Date(date.getTime());
            var todayEnd = new Date(date.getTime());
            todayStart.setHours(0, 0, 0, 0);
            todayEnd.setHours(23, 59, 59, 999);
            db.transaction(function (tx) {
                tx.executeSql('SELECT * FROM events WHERE date BETWEEN ? AND ? ORDER BY date ASC;', [todayStart, todayEnd], that.dHandler(dataHandler));
            }, (failureHandler || that.dFailureHandler), (successHandler || that.dSuccessHandler));
        },
        findUpToDate: function (date, dataHandler, successHandler, failureHandler) {
            var that = this;
            db.transaction(function (tx) {
                tx.executeSql('SELECT * FROM events WHERE date < ? ORDER BY date ASC;', [date], that.dHandler(dataHandler));
            }, (failureHandler || that.dFailureHandler), (successHandler || that.dSuccessHandler));
        },
        remove: function (title, successHandler, failureHandler) {
            var that = this;
            db.transaction(function (tx) {
                tx.executeSql('delete from events where title=?;', [title]);
            }, (failureHandler || that.dFailureHandler), (successHandler || that.dSuccessHandler));
        },
        create: function(date, time, title, desc, repeat, successHandler, failureHandler) {
            var that = this;
            db.transaction(function (tx) {
                tx.executeSql('INSERT INTO events (date, time, title, desc, rep) VALUES (?, ?, ?, ?, ?)', [date, time, title, desc, repeat]);
            }, (failureHandler || that.dFailureHandler), (successHandler || that.dSuccessHandler));
        }
    };

    var eController = {
        eventList: $('#eventList'),
        otherEventList: $('#otherEventList'),
        displayEvents: function (date) {
            var that = this;
            eService.findByDate(date, function (entities) {
                that.events = entities;
                that.removeEvents();

                //if (that.events == 0) {
                //    that.eventList.append('<li>No events!<li>');
                //}

                for (var i = 0; i < that.events.length; i++) {
                    var event = that.events[i];
                    that.eventList.append('<li data-icon="delete"><a class="event" id="' + event['title'] + '" href="#"><h3>'
                    + event['title'] + '</h3><p>' + event['time'] + '</p></a><a id="' + event['title'] + '" class="delete" href="#"></a></li>');
                }
                that.eventList.listview('refresh');
            });
        },
        displayEvent: function(title) {
            eService.findByTitle(title, function(entities) {
                for (var i = 0; i < entities.length; i++) {
                    var entity = entities[i];
                    $('<div>').simpledialog2({
                        mode: 'blank',
                        headerText: title,
                        headerClose: true,
                        blankContent: "<p> <span class='event_time'>" + entity['date'] + '<br>' + entity['time'] + "</span><br>" + entity['desc'] + "</p>" +
                        "<a rel='close' data-role='button' href='#'>Close</a>"
                    })
                    console.log(entity['rep']);
                }
            })
        },
        removeEvents: function () {
            this.eventList.find("[data-icon='delete']").remove();
        },
        removeEvent: function(title) {
            var that = this;
            $('<div>').simpledialog2({
                mode: 'button',
                headerText: 'Delete Event',
                headerClose: true,
                buttonPrompt: 'Are you sure you want to delete?',
                buttons: {
                    'Yes': {
                        click: function () {
                            eService.remove(title, function() {
                                that.displayEvents(new Date());
                            });
                        }
                    },
                    'No': {
                        click: function () {
                        },
                        icon: "delete",
                        theme: "c"
                    }
                }
            })
        },
        addEvent: function(date, time, title, desc, repeat) {
            if (!date) {
                alert("Please select a date !");
                return;
            }

            if (!time) {
                alert("Please select a time!");
                return;
            }

            if (!title) {
                alert("Please enter a title!");
                return;
            }

            date.setHours(time.getHours(), time.getMinutes(), 0, 0);
            time = time.getHours() + ":" + time.getMinutes();
            eService.create(date, time, title, desc, repeat, function() {
                alert("Event has been saved!");
            });
        }
    };

    var eNotificator = {
        opened : false,
        start : function() {
            var that = this;
            var callback = function () {
                that.notify();
                setTimeout(callback, 6000)
            };

            callback();
        },
        stop : function () {
            clearTimeout(this.timeout);
        },
        notify: function() {
            var that = this;
            eService.findUpToDate(new Date(), function(entities) {
                console.log("Notif");
                console.log(entities);
                if(!that.opened && entities.length) {
                    that.opened = true;
                    var content = "";
                    for (var i = 0; i < entities.length; i ++) {
                        content += "<p> <span class='event_time'>" + entities[i]['date'] + '<br>' + entities[i]['title'] + "</span><br>" + entities[i]['desc'] + "</p>";
                        eService.remove(entities[i]['title']);
                    }
                    content += "<a rel='close' data-role='button' href='#'>Close</a>";

                    $('<div>').simpledialog2({
                        mode: 'blank',
                        headerText: 'Notification',
                        headerClose: true,
                        blankContent: content,
                        callbackClose: function () {
                            that.opened = false;
                            eController.displayEvents(new Date());
                        }
                    });
                }
            });
        }
    };

    eService.init();
    eController.displayEvents(new Date());
    eNotificator.start();

    $('#create_new_btn').click(function () {
        $.mobile.changePage($('#page-new-event'), {transition: "slide"});
    });

    $('.home_btn').click(function () {
        $.mobile.changePage($('#page-home'), {transition: "slide"});
        eController.displayEvents(new Date());
    });

    $('#save_btn').click(function () {
        eController.addEvent(datetime.val() && datetime.datebox('getTheDate'),datetime1.val() && datetime1.datebox('getTheDate'), title.val(), desc.val(), repeat.val() && repeat.datebox('getTheDate'));
    });

    $(document).delegate('.event', 'click', function () {
        eController.displayEvent(this.id);
    });

    $('#other_events_btn').click(function () {
        // TODO
        $.mobile.changePage($('#page-other'), {transition: "slide"});
    });

    $(document).delegate('.delete', 'click', function () {
        eController.removeEvent(this.id);
    })
});

function otherEvents(tx, rse) {
    // TODO list all events
    e = $('#otherEventList');
    for (var i = 0; i < rse.rows.length; i++) {
        re = rse.rows.item(i);
        e.append('<li data-icon="delete"><a class="event" id="' + re['title'] + '" href="#"><h3>' + re['title']
        + '</h3><p>' + re['date'] + '<br>' + re['time'] + '</p></a><a id="' + re['title'] + '" class="delete" href="#"></a></li>');
        //$('#otherEventList').listview('refresh');
    }
}