package example;

import com.qcloud.scf.runtime.AbstractSpringHandler;

//import org.springframework.http.MediaType;
//import java.util.Collections;
//import java.util.List;

public class MyHandler extends AbstractSpringHandler {

    /*
       自定义需要转换成Base64的MediaType列表，默认为MediaType.ALL
    */
//    @Override
//    public List<MediaType> getBinaryTypes() {
//        return Collections.singletonList(MediaType.IMAGE_PNG);
//    }

    @Override
    public void startApp() {
        System.out.println("start app");
        DemoApplication.main(new String[]{""});
    }

}
