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
    //Session.set("currentSlide", 1);
    
    Deps.autorun(function () {
        Meteor.subscribe('users');
        Meteor.subscribe('questions');
        Meteor.subscribe('state', function onReady() {
            Session.set("currentSlide", State.findOne({name: 'currentSlide'}).value);
        });
        State.find({name: 'currentSlide'}).observe({
            changed: function() {
                Session.set("currentSlide", State.findOne({name: 'currentSlide'}).value);
            }
        });
    });

    //**** Presentation ****\\
    Template.presentation.questions = function() {
        return Questions.find({});
    };

    Template.question.isCurrent = function() {
        return this.qnumber === Session.get('currentSlide') ? "show" : "hide";
    };

    Template.question.totalUsers = function() {
        return Meteor.users.find({"status.online": true , eliminated: false}).count();
    };

    //**** Client ****\\
    Template.client.questions = function() {
        return Questions.find({});
    };

    Template.questionclient.isCurrent = function() {
        var user = Meteor.user(),
            extra = '',
            q;
        
        if (!_.isUndefined(user) && !_.isUndefined(user.questions)) {
            q = _.findWhere(user.questions, {_id:this._id});
            if (!_.isUndefined(q)) {
                extra = q.answer;
            }
        }
        return (this.qnumber === Session.get('currentSlide') ? "show" : "hide") + " " + extra;
    };

    Template.client.loggedIn = function() {
        return Meteor.user() !== null;
    };
    
    Template.client.eliminated = function() {
        return Meteor.user().eliminated ? 'eliminated' : '';
    }
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
}

if (Meteor.isServer) {
    Meteor.startup(function () {
        Questions.remove({});
        Questions.insert({
            qnumber: 1,
            question: "Which is a music service?",
            answers: [
                {id: 1, answer: "Spotify", correct:true},
                {id: 2, answer: "Twitter", correct: false}
            ],
            answered: 0
        });
        Questions.insert({
            qnumber: 2,
            question: "Which is microsoft search engine?",
            answers: [
                {id: 3, answer: "Bing", correct:true},
                {id: 4, answer: "Bong", correct: false}
            ],
            answered: 0
        });
        Questions.insert({
            qnumber: 3,
            question: "What does MPU stands for?",
            answers: [
                {id: 5, answer: "Multiple Product Unit", correct:false},
                {id: 6, answer: "Mid Page Unit", correct: true}
            ],
            answered: 0
        });
        State.remove({});
        State.insert({
            name: 'currentSlide',
            value: 1           
        });
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
                Meteor.users.update(Meteor.userId(), {$push: {"questions":{_id:qid, answer:state}}});
                if (state === 'incorrect') {
                    Meteor.users.update(Meteor.userId(), {$set : {"eliminated":true}});
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

    Meteor.publish("users", function() {
        return Meteor.users.find({ "status.online": true });
    });
    Meteor.publish("questions", function() {
        return Questions.find({});
    });
    Meteor.publish("state", function() {
        return State.find({});
    });
}
