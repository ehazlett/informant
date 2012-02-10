Informant
=========
Informant is a Node.js application that displays realtime notifications (using socket.io) from Github (using a Post-Receive hook).  

Setup
------
* Install Node.js
* Install Redis (informant is configured to connect to a Redis instance on localhost:6379 by default)
* Clone Informant
* `npm install socket.io redis`
* Run node app on a public url `node app.js`
* Configure a Github Post-Receive hook (http://help.github.com/post-receive-hooks/) to `http://<your-public-informant-url>/receive`

Notifications
-------------
Informant can also notify on pull-requests.  To enable this for a repository, click Admin->Add Repository in the informant app menu using the following:

    Repository name: Name of the Github repository (i.e. informant)
    Owner: Github owner of the repository (where the fork you want to watch is - i.e. ehazlett)
    Options: Check the "Pull-Requests" option

** If the repository is a private repo, you will need to click Admin->Github Authorization first to grant Informant access to your private repository (using OAuth).  Once you authorize the application, click Admin->Add Repository and enter the following for the private section:

    Private: Check the "Private Repository" checkbox (this will enable the Github Account field.
    Github Account: Enter the Github user account that was used during the Github Authorization step. 


Informant can also use desktop notifications (currently only supported on the Chrome/Chromium browser).  To enable, click Admin->Enable Notifications and click the "Allow" button.

