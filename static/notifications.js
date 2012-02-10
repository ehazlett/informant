function showNotification(title, message, imgUrl) {
  if (webkitNotifications) {
    var img = imgUrl ? imgUrl : '/static/img/info_32.png';
    webkitNotifications.createNotification(img, title, message).show();
  }
}
