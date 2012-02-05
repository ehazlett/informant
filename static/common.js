function createEvent(title, colAtext, colBtext) {
  $("div.welcome").remove();
  var item = '';
  item += '<div class="row event shadow">';
  item += ' <div><h1>' + title + '</h1></div>';
  item += ' <div class="span5">' + colAtext + '</div>';
  item += ' <div class="span5">' + colBtext + '</div>';
  item += '</div>';
  $(item).prependTo("#events");
}
function validateForm(formId) {
  errors = false;
  $("#"+formId+" :input.required").each(function(i, f){ 
    if ($(f).val() == '') {
      $(f).parent().parent().addClass('error');
      errors = true;
    } else {
      $(f).parent().parent().removeClass('error');
    }   
  }); 
  if (errors) {
    return false;
  } else {
    return true;
  }
}
function flash(text, status){
  var msg = $("<div class='alert fade in'></div>");
  if (!status){
    status = 'info';
  }
  msg.addClass('alert-'+status);
  msg.append("<a class='close' data-dismiss='alert' href='#'>x</a>");
  msg.append('<p>'+text+'</p>');
  $("#messages").prepend(msg);
  $("#messages").removeClass('hide');
  $(".alert").alert();
  $(".alert").delay(5000).fadeOut();
}
