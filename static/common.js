function createEvent(title, colAtext, colBtext) {
  $("div.welcome").remove();
  var item = '';
  item += '<div class="row event">';
  item += ' <div><h1>' + title + '</h1></div>';
  item += ' <div class="span5">' + colAtext + '</div>';
  item += ' <div class="span5">' + colBtext + '</div>';
  item += '</div>';
  $(item).prependTo("#events");
}
