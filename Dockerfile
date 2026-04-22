FROM docker.elastic.co/kibana/kibana:8.19.12
COPY build/annotator-8.19.12.zip /usr/share/kibana/installplugins/annotator/build/
RUN /usr/share/kibana/bin/kibana-plugin install file:///usr/share/kibana/installplugins/annotator/build/annotator-8.19.12.zip
RUN /usr/share/kibana/bin/kibana --optimize
