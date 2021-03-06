
  /***************************************************************************/
  /* Augeo.io is a web application that uses Natural Language Processing to  */
  /* classify a user's internet activity into different 'skills'.            */
  /* Copyright (C) 2016 Brian Redd                                           */
  /*                                                                         */
  /* This program is free software: you can redistribute it and/or modify    */
  /* it under the terms of the GNU General Public License as published by    */
  /* the Free Software Foundation, either version 3 of the License, or       */
  /* (at your option) any later version.                                     */
  /*                                                                         */
  /* This program is distributed in the hope that it will be useful,         */
  /* but WITHOUT ANY WARRANTY; without even the implied warranty of          */
  /* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the           */
  /* GNU General Public License for more details.                            */
  /*                                                                         */
  /* You should have received a copy of the GNU General Public License       */
  /* along with this program.  If not, see <http://www.gnu.org/licenses/>.   */
  /***************************************************************************/

  /***************************************************************************/
  /* Description: Binds data to dashboard.html                               */
  /***************************************************************************/

  // Reminder: Update controller/index.js when controller params are modified
  module.exports = function($scope, $timeout, $interval, $stateParams, TwitterClientService, ActivityService, ProfileService) {

    // Internal functions
    var init = function() {

      $scope.invalidUser = false;
      $scope.targetUsername = $stateParams.username;

      // Get user's profile image and Augeo skill data
      TwitterClientService.getDashboardDisplayData($scope.targetUsername, function(data) {

        if(data != 'Unauthorized') {

          $scope.isLoaded = true;

          if(data.dashboardData) {
            $scope.profileData = data.dashboardData.user;
            $scope.mainSkill = data.dashboardData.skill;
            $scope.skills = data.dashboardData.subSkills;

            var mediumScreenArray = new Array();
            var mediumCount = 0;
            for (var i = 0; i < 3; i++) {
              var innerArray = new Array();
              for (var j = 0; j < 3; j++) {
                innerArray.push($scope.skills[mediumCount]);
                mediumCount++;
              }
              mediumScreenArray.push(innerArray);
            }
            $scope.mediumArray = mediumScreenArray;

            var smallScreenArray = new Array();
            var smallCount = 0;
            for (var i = 0; i < 5; i++) {
              var innerArray = new Array();
              for (var j = 0; j < 2; j++) {
                innerArray.push($scope.skills[smallCount]);
                smallCount++;
              }
              smallScreenArray.push(innerArray);
            }
            $scope.smallArray = smallScreenArray;
          }

          // Set recent activity
          if (data.recentActions.length > 0) {

            var currentIndex = 0;
            var formatTweets = true;

            $scope.visible = true;
            data.recentActions[0] = ActivityService.formatTweet(data.recentActions[0]);
            $scope.currentTweet = data.recentActions[0];

            // Transition logic
            $interval(function () {
              $scope.visible = false;
              currentIndex++;

              // Reset to first tweet
              if (currentIndex == data.recentActions.length) {
                currentIndex = 0;
                formatTweets = false;
              }

              $timeout(function () {
                if (formatTweets === true) {
                  data.recentActions[currentIndex] = ActivityService.formatTweet(data.recentActions[currentIndex]);
                }
                $scope.currentTweet = data.recentActions[currentIndex];

                $scope.visible = true;
              }, 1000);
            }, 3500);
          }

          if (data.errorImageUrl) {
            $scope.invalidUser = true;
            $scope.profileData.profileImg = data.errorImageUrl
          }
        }
      });
    };

    $scope.showProfile = function() {

      var targetUser = $scope.profileData;
      if($scope.User.username == $scope.profileData.username) {
        targetUser = $scope.User;
      }

      ProfileService.setTargetUser(targetUser);

      showProfileModal();
    };

    // Initialize dashboard page
    init();
  };