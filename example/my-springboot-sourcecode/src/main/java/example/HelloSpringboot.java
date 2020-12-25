package example;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloSpringboot {

    @RequestMapping
    public String myFunc() {
        System.out.println("Into springboot index request");
        return "Welcome to Spring Boot！~";
    }

    @RequestMapping("/test")
    public String jsonRes() throws JsonProcessingException {
        ObjectMapper mapper = new ObjectMapper();
        Person person = new Person("test admin");
        return mapper.writeValueAsString(person);
    }

    @RequestMapping("/hello")
    public String say(@RequestParam("username") String username) {
        String result = "Hi, " + username;
        System.out.println(result);
        return (result);
    }

}
