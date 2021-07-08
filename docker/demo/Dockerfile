FROM ubuntu:18.04

# Install required binaries
RUN apt-get upgrade && apt-get update -y && apt-get install -y \
   mongodb python3 python3-dev python3-pip \
   pkg-config \
   git cmake clang curl \
   libpcre3-dev swig \
   zlib1g-dev libgcrypt-dev libssl-dev \
   libprotobuf-c-dev protobuf-c-compiler libavl-dev libev-dev \
   libffi-dev python3-setuptools nginx

RUN curl -sL https://deb.nodesource.com/setup_14.x | bash - && apt-get install -y nodejs

# Install libssh from source (Version from apt is incompatible with libnetconf2)
RUN git clone -b stable-0.8 http://git.libssh.org/projects/libssh.git ; cd libssh; mkdir build; cd build ;\
    cmake ..; make; make install ; cd /

# Install libyang
RUN git clone -b libyang1 https://github.com/CESNET/libyang.git && cd libyang; \
  mkdir build; cd build && \
  cmake -DGEN_LANGUAGE_BINDINGS=ON -DGEN_JAVA_BINDINGS=OFF .. && make && make install && cd ../.. && ldconfig ; cd /

# Install libnetconf2
RUN git clone -b libyang1 https://github.com/CESNET/libnetconf2.git && cd libnetconf2 && \
  mkdir build && cd build && \
  cmake -DENABLE_PYTHON=ON .. && make && make install && cd ../.. && ldconfig &&  \
  python3 /libnetconf2/build/python/setup.py install && cd /
# Manually running setup.py is a temporary workaround because of a bug in libnetconf2

# Install sysrepo
RUN git clone -b libyang1 https://github.com/sysrepo/sysrepo.git ; \
    cd sysrepo; mkdir build; cd build; \
    cmake -DGEN_LANGUAGE_BINDINGS=OFF .. && make && make install; \
    cd ../.. ; \
    ldconfig ; cd /

# Install netopeer
RUN git clone -b devel https://github.com/CESNET/Netopeer2.git ;\
    cd Netopeer2; mkdir build; cd build ;\
    cmake .. && make && make install ; cd /

# Prepare GUI 
RUN git clone https://github.com/CESNET/liberouter-gui
RUN cd /liberouter-gui/modules && git clone -b v2 https://github.com/CESNET/netopeer2gui 
# && rm -rf /liberouter-gui/modules/example
RUN cp /liberouter-gui/modules/netopeer2gui/app.config.json /liberouter-gui/modules/app.config.json && rm /liberouter-gui/modules/netopeer2gui/app.config.json
RUN cd /liberouter-gui && python3 bootstrap.py && \
    pip3 install -r backend/requirements.txt && \
    cd frontend && npm install -g npm@7.5.2 && \
    npm i -g @angular/cli && npm install --legacy-peer-deps

# Temporary workaround until import is fixed for tools
RUN rm /liberouter-gui/modules/netopeer2gui/frontend/projects/shared-styles/_colors.scss && \
  cp /liberouter-gui/frontend/src/styles/_colors.scss /liberouter-gui/modules/netopeer2gui/frontend/projects/shared-styles/_colors.scss
RUN echo "\$colorSuccess:     #44bd32;" >> /liberouter-gui/modules/netopeer2gui/frontend/projects/shared-styles/_colors.scss && \
    echo "\$colorError:       #ee1d23;" >> /liberouter-gui/modules/netopeer2gui/frontend/projects/shared-styles/_colors.scss

# Build GUI
RUN cd /liberouter-gui/modules/netopeer2gui/frontend && npm i && npm run build:tools && cd
RUN cd /liberouter-gui/frontend && npm run build && cp -R dist/* /var/www/html 

# Setup ngix server with uwsgi
RUN mkdir -p /var/www/liberouter-gui && cp -r /liberouter-gui/backend /var/www/liberouter-gui
RUN rm /var/www/liberouter-gui/backend/liberouterapi/modules/netconf && cp -r /liberouter-gui/modules/netopeer2gui/backend/. /var/www/liberouter-gui/backend/liberouterapi/modules/netopeer2gui
RUN cp /liberouter-gui/modules/netopeer2gui/docker/wsgi.py /var/www/liberouter-gui/backend/wsgi.py
RUN pip3 install wheel && pip3 install uwsgi; mkdir /uwsgi; chown -R www-data:www-data /uwsgi

COPY localhost /etc/nginx/sites-available/
RUN ln /etc/nginx/sites-available/localhost /etc/nginx/sites-enabled

COPY config.ini /var/www/liberouter-gui/backend/config.ini
COPY .htaccess /var/www/html/.htaccess
RUN chown -R www-data:www-data /var/www/liberouter-gui
RUN chown -R www-data:www-data /liberouter-gui/modules/netopeer2gui/backend
# App needs to write configuration files
RUN chmod -R +w /var/www/liberouter-gui/backend/liberouterapi/modules/netopeer2gui/ ; mkdir -p /var/www/liberouter-gui/backend/liberouterapi/modules/netopeer2gui/userfiles
RUN rm /etc/nginx/sites-enabled/default
RUN pip3 install Flask-SocketIO==4.3.2

# Change root password for netconf connection
# DO NOT USE IN PRODUCTION ENVIRONMENT!
RUN echo 'root:docker' | chpasswd

# Expose HTTP
EXPOSE 80/tcp
EXPOSE 5555/tcp
# EXPOSE 830

COPY services.sh /root
CMD ["/bin/bash", "/root/services.sh"]
