/* global Questions, State, Meteor, Router, $, Session, Template, Deps, _, console, Accounts */

Questions = new Meteor.Collection('questions');
State = new Meteor.Collection('state');

Router.map(function() {
    this.route('presentation', {path: '/'});
    this.route('client', {
        path: '/client',
        onBeforeAction: function() {
            $('body').addClass('client');
        },

        onStop: function() {
            $('body').removeClass('client');
        }
    });
    this.route('controller', {path: '/controller'});
});

if (Meteor.isClient) {
    //Session.set('currentSlide', 1);

    Deps.autorun(function () {
        Meteor.subscribe('users');
        Meteor.subscribe('questions');
        Meteor.subscribe('state', function onReady() {
            Session.set('currentSlide', State.findOne({name: 'currentSlide'}).value);
        });
        State.find({name: 'currentSlide'}).observe({
            changed: function() {
                Session.set('currentSlide', State.findOne({name: 'currentSlide'}).value);
            }
        });
    });

    //**** Presentation ****\\
    Template.presentation.questions = function() {
        return Questions.find({});
    };

    Template.question.isCurrent = function() {
        var isCurrent = this.qnumber === Session.get('currentSlide'),
            scope = this;

        if (isCurrent) {
            console.log('isCurrent', this.qnumber);
            if (this.type === 'question') {
                var seconds = 10;
                $('#question'+this.qnumber+' .timer').text('0:10');
                $('#question'+this.qnumber+' .timebar').width($(window).width());
                console.log($('#question'+this.qnumber+' .timer').width());
                $({value:seconds}).stop().animate({value: 0}, {
                    duration: seconds*1000,
                    easing: 'linear',
                    step: function() {
                        var v = Math.ceil(this.value) < 10 ?  '0'+Math.ceil(this.value) : Math.ceil(this.value);
                        $('#question'+scope.qnumber+' .timer').text('0:'+v);
                    },
                    complete: function() {
                        $('#question'+scope.qnumber+' .timer').text('0:00');
                    }
                });
                $('#question'+this.qnumber+' .timebar').stop().animate({width: 0}, {
                    duration: seconds*1000,
                    easing: 'linear'
                });
            }

            if (this.type === 'welcome') {
                window.StopWatch.init(new Date(2015,7,7,17,0,0,0).getTime(), $('#countdown'));
                window.StopWatch.start();
            }
        }

        return isCurrent ? 'show' : 'hide';
    };

    Template.question.totalUsers = function() {
        return Meteor.users.find({'status.online': true , eliminated: false}).count();
    };

    Template.question.isQuestion = function() {
        return this.type === 'question';
    };

    //**** Client ****\\
    Template.client.questions = function() {
        return Questions.find({});
    };

    Template.questionclient.isCurrent = function() {
        var user = Meteor.user(),
            extra = '',
            q,
            isCurrent;

        if (!_.isUndefined(user) && !_.isUndefined(user.questions)) {
            q = _.findWhere(user.questions, {_id:this._id});
            if (!_.isUndefined(q)) {
                extra = q.answer;
            }
        }

        isCurrent = this.qnumber === Session.get('currentSlide');

        if (isCurrent) {
            if (this.type === 'question') {
                var seconds = 10;
                $('#question'+this.qnumber+' .timebar').width($(window).width());
                $('#question'+this.qnumber+' .timebar').stop().animate({width: 0}, {
                    duration: seconds*1000,
                    easing: 'linear'
                });
            }
        }
        return (isCurrent ? 'show' : 'hide') + ' ' + extra;
    };

    Template.questionclient.isQuestion = function() {
        return this.type === 'question';
    };

    Template.client.loggedIn = function() {
        return Meteor.user() !== null;
    };

    Template.client.eliminated = function() {
        return (!_.isUndefined(Meteor.user()) && Meteor.user().eliminated) ? 'eliminated' : '';
    };
    //Events\\
    Template.answerclient.events({
        'click': function(evt) {
            var qid = $(evt.target).parents('.b-slide-question').data('qid'),
                state = this.correct ? 'correct' : 'incorrect';
            $(evt.target).parents('.b-slide-question').addClass(state);
            Questions.update(qid, {$inc : {answered: 1}});
            Meteor.call('answer', qid, state);
            console.log(Meteor.user());
        }
    });

    //**++ Controller ****\\
    Template.controller.currentSlide = function() {
        return Session.get('currentSlide');
    };
    Template.controller.users = function() {
        return Meteor.users.find({eliminated: false});
    };
    //Events\\
    Template.controller.events({
        'click #next': function(evt) {
            Meteor.call('nextSlide');
        },
        'click #prev': function(evt) {
            Meteor.call('prevSlide');
        },
    });

    window.StopWatch = {
        date: new Date(),
        timer: false,
        target: $(document),
        init: function(time, target) {
            StopWatch.setTime(time);
            this.target = target;
        },
        start: function() {
            StopWatch.timer = setInterval(StopWatch.refresh,1000)
        },
        stop: function() {
            clearInterval(StopWatch.timer);
        },
        setTime: function(time) {
            this.date.setTime(time);
        },
        getDiff: function() {
            var now = new Date();
            return this.date.getTime() > now.getTime() ? ((this.date.getTime()-now.getTime())/1000) : 0;
        },
        getTimeBreakdown: function() {
            var breakdown = {
                days: 0,
                hours: 0,
                minutes: 0,
                seconds: 0
            }
            var diff = this.getDiff();
            var days_raw = diff/86400;
            breakdown.days = Math.floor(days_raw);
            var hours_raw = (days_raw - breakdown.days) * 24;
            breakdown.hours = Math.floor(hours_raw);
            var minutes_raw = (hours_raw - breakdown.hours) * 60;
            breakdown.minutes = Math.floor(minutes_raw);
            var seconds_raw = (minutes_raw - breakdown.minutes) * 60;
            breakdown.seconds = Math.round(seconds_raw) == 60 ? 0 : Math.round(seconds_raw);
            return breakdown;
        },
        refresh: function() {
            var breakdown = StopWatch.getTimeBreakdown();
            StopWatch.target.find("[data-type='days']").html(breakdown.days);
            StopWatch.target.find("[data-type='hours']").html(breakdown.hours);
            StopWatch.target.find("[data-type='minutes']").html(breakdown.minutes);
            StopWatch.target.find("[data-type='seconds']").html(breakdown.seconds);
        }
    };
}

if (Meteor.isServer) {
    Meteor.startup(function () {
        Questions.remove({});
        Questions.insert({
            qnumber: 1,
            type: 'welcome',
            question: '',
            answers: [],
            answered: 0
        });
        Questions.insert({
            qnumber: 2,
            type: 'question',
            question: 'Which is a music service?',
            answers: [
                {id: 1, answer: 'Spotify', correct:true},
                {id: 2, answer: 'Twitter', correct: false}
            ],
            answered: 0
        });
        Questions.insert({
            qnumber: 3,
            type: 'question',
            question: 'Which is microsoft search engine?',
            answers: [
                {id: 3, answer: 'Bing', correct:true},
                {id: 4, answer: 'Bong', correct: false}
            ],
            answered: 0
        });
        Questions.insert({
            qnumber: 4,
            type: 'question',
            question: 'What does MPU stands for?',
            answers: [
                {id: 5, answer: 'Multiple Product Unit', correct:false},
                {id: 6, answer: 'Mid Page Unit', correct: true}
            ],
            answered: 0
        });
        State.remove({});
        State.insert({
            name: 'currentSlide',
            value: 1
        });
        Meteor.users.update({eliminated: true}, {$set: {eliminated: false}}, {multi: true});
    });

    Accounts.onCreateUser(function(options, user) {
        var email = user.emails[0].address;
        user.profile = {};
        user.profile.email = email;
        user.eliminated = false;
        return user;
    });

    Meteor.methods({
        answer: function(qid, state) {
            if (_.isUndefined(_.findWhere(Meteor.user().questions, {_id:qid}))) {
                Meteor.users.update(Meteor.userId(), {$push: {'questions':{_id:qid, answer:state}}});
                if (state === 'incorrect') {
                    Meteor.users.update(Meteor.userId(), {$set : {'eliminated':true}});
                }
            }
        },
        nextSlide: function() {
            var id = State.findOne({name: 'currentSlide'})._id;
            State.update(id, {$inc : {value: 1}});
        },
        prevSlide: function() {
            var id = State.findOne({name: 'currentSlide'})._id;
            State.update(id, {$inc : {value: -1}});
        }
    });

    Meteor.publish('users', function() {
        return Meteor.users.find({ 'status.online': true });
    });
    Meteor.publish('questions', function() {
        return Questions.find({});
    });
    Meteor.publish('state', function() {
        return State.find({});
    });
}
