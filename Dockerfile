FROM ubuntu:16.04

RUN \
      apt-get update && apt-get install -y \
      # general tools
      openssh-client \
      git \
      cmake \
      build-essential \
      vim \
      supervisor \
      # libyang
      libpcre3-dev \
      pkg-config \
      # bindings
      swig \
      python-dev \
      # GUI 
      curl \
      python3 \
      python3-flask \
      python3-pip \
      npm \
      nodejs-legacy && \
      npm install -g n && n stable && \
      ln -fs /usr/local/bin/node /usr/bin/node && \
      ln -fs /usr/local/bin/npm /usr/bin/npm && \
      ln -fs /usr/local/bin/npx /usr/bin/npx && \
      # Clean-up
      rm -rf /var/lib/apt/lists/* && \
      git config --global http.sslVerify false

# use /opt/dev as working directory
RUN mkdir /opt/dev
WORKDIR /opt/dev

RUN \
# libyang
      git clone -b devel https://github.com/CESNET/libyang.git && \
      cd libyang && mkdir build && cd build && \
      cmake -DGEN_LANGUAGE_BINDINGS=ON -DCMAKE_BUILD_TYPE:String="Release" -DENABLE_BUILD_TESTS=OFF .. && \
      make -j2 && \
      make install && \
      ldconfig
RUN \
# libssh
      git clone http://git.libssh.org/projects/libssh.git && \
      cd libssh && mkdir build && cd build && \
      cmake .. && \
      make -j2 && \
      make install && \
      ldconfig
RUN \
# libnetconf2
      git clone -b devel https://github.com/CESNET/libnetconf2.git && \
      cd libnetconf2 && mkdir build && cd build && \
      cmake -DENABLE_PYTHON=ON -DENABLE_BUILD_TESTS=OFF .. && \
      make && \
      make install && \
      ldconfig && \
      cd /opt/dev

RUN git clone -b devel https://github.com/CESNET/liberouter-gui.git

COPY modules/ /opt/dev/liberouter-gui/modules/

RUN \
    cd liberouter-gui && \
    python3 ./bootstrap.py && \
    pip3 install --upgrade pip && \
    pip3 install -r backend/requirements.txt && \
    cd frontend && \
    npm install --unsafe-perm -g @angular/cli && \
    npm install --unsafe-perm

WORKDIR /opt/dev/liberouter-gui/frontend

ENV EDITOR vim
EXPOSE 4200

COPY supervisord.conf /etc/supervisord.conf
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]