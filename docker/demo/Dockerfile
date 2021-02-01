FROM ubuntu:18.04

# Install required binaries
RUN apt-get upgrade && apt-get update -y && apt-get install -y \
   mongodb python3 python3-dev python3-pip \
   pkg-config \
   git cmake clang curl \
   libpcre3-dev swig \
   zlib1g-dev libgcrypt-dev libssl-dev \
   libprotobuf-c-dev protobuf-c-compiler libavl-dev libev-dev \
   apache2 apache2-dev

RUN curl -sL https://deb.nodesource.com/setup_15.x | bash - && apt-get install -y nodejs

# Install libssh from source (Version from apt is incompatible with libnetconf2)
RUN git clone -b v0-7 http://git.libssh.org/projects/libssh.git ; cd libssh; mkdir build; cd build ;\
    cmake ..; make; make install ; cd

# Install libyang
RUN git clone -b devel https://github.com/CESNET/libyang.git && cd libyang; \
  mkdir build; cd build && \
  cmake -DGEN_LANGUAGE_BINDINGS=ON -DGEN_JAVA_BINDINGS=OFF .. && make && make install && cd ../.. && ldconfig ; cd

# Install libnetconf2
RUN git clone -b devel https://github.com/CESNET/libnetconf2.git && cd libnetconf2; \
  mkdir build; cd build && \
  cmake -DENABLE_PYTHON=ON .. && make && make install && cd ../.. && ldconfig ; cd


# Install sysrepo
RUN git clone -b devel https://github.com/sysrepo/sysrepo.git ; \
    cd sysrepo; mkdir build; cd build; \
    cmake -DGEN_LANGUAGE_BINDINGS=OFF .. && make && make install; \
    cd ../.. ; \
    ldconfig ; cd

# Install netopeer
RUN git clone -b devel https://github.com/CESNET/Netopeer2.git ;\
    cd Netopeer2; mkdir build; cd build ;\
    cmake .. && make && make install ; cd

# Prepare GUI 
# TODO: Remove example and add app.config.json to import assets
RUN git clone https://github.com/CESNET/liberouter-gui 
RUN cd /liberouter-gui/modules && git clone -b v2 https://github.com/CESNET/Netopeer2GUI && cd
RUN cd /liberouter-gui && python3 bootstrap.py && \
    pip3 install -r backend/requirements.txt && \
    cd frontend && npm i -g npm && \
    npm i -g @angular/cli && npm install ; cd

# Build GUI
RUN mkdir /etc/httpd ; mkdir /etc/httpd/conf.modules.d 
RUN pip3 install mod_wsgi
RUN mod_wsgi-express module-config >/etc/httpd/conf.modules.d/00-wsgi.conf
RUN cd /liberouter-gui/modules/Netopeer2GUI/frontend && npm i && npm run build:tools && cd
RUN cd /liberouter-gui/frontend && npm run build && cp -R dist/* /var/www/html 
RUN cp /liberouter-gui/modules/Netopeer2GUI/docker/wsgi.py /var/www/liberouter-gui/backend/wsgi.py

# Expose ports and run services
RUN mkdir -p /data/db 2>/dev/null \
    mongod --fork --logpath /var/log/mongod.log
RUN sysrepod
RUN httpd
RUN netopeer2-server

EXPOSE 80/tcp