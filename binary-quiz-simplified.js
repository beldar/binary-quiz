var Questions = new Meteor.Collection('questions');

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
    Session.set("currentQuestion", 1);

    Deps.autorun(function () {
        Meteor.subscribe('onlineUsers');
        Meteor.subscribe('questions');
    });

    //Presentation
    Template.presentation.questions = function() {
        return Questions.find({});
    };

    Template.question.isCurrent = function() {
        return this.qnumber === Session.get('currentQuestion') ? "show" : "hide";
    };

    Template.question.totalUsers = function() {
        return Meteor.users.find({"status.online": true }).count();
    };

    //Client
    Template.client.questions = function() {
        return Questions.find({});
    };

    Template.questionclient.isCurrent = function() {
        return this.qnumber === Session.get('currentQuestion') ? "show" : "hide";
    };

    Template.client.loggedIn = function() {
        return Meteor.user() !== null;
    };

    Template.answerclient.events({
        'click': function(evt) {
            console.log(this.correct, this.qnumber);
            if (this.correct) {
                $(evt.target).parents('.valign').find('.correct').css('display', 'block');
            } else {
                Meteor.call('eliminate');
            }
            Questions.update(this.id, {$inc : {answered: 1}});
        }
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
    });

    Meteor.methods({
        eliminate: function() {
            Meteor.users.update(Meteor.userId, {"user.status.eliminated":true});
        }
    });

    Meteor.publish("onlineUsers", function() {
        return Meteor.users.find({ "status.online": true });
    });
    Meteor.publish("questions", function() {
        return Questions.find({});
    });
}
