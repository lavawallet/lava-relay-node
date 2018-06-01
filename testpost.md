<script>
      $(document).ready(function(){
        var user,pass;
        $("#submit").click(function(){
          user=$("#user").val();
          pass=$("#password").val();
          $.post("http://localhost:3000/login",{user: user,password: pass}, function(data){
            if(data==='done')
              {
                alert("login success");
              }
          });
        });
      });
    </script>
