FROM ubuntu:16.04

RUN \
      apt-get update && apt-get install -y \
      # general tools
      openssh-client \
      wget \
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
      python3-dev \
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
      ln -fs /bin/bash /bin/sh && \
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
      cmake -DGEN_LANGUAGE_BINDINGS=ON .. && make && make install && \
      cd ../.. && \
      ldconfig
RUN \
# libssh
      rm -rf libssh-0.7.5* && \
      wget https://git.libssh.org/projects/libssh.git/snapshot/libssh-0.7.5.tar.gz && \
      tar -xzf libssh-0.7.5.tar.gz && \
      mkdir libssh-0.7.5/build && cd libssh-0.7.5/build && \
      cmake -DCMAKE_INSTALL_PREFIX:PATH=/usr .. && make -j2 && make install && \
      cd ../..
RUN \
# libnetconf2
      rm -rf libnetconf2 && \
      git clone -b devel https://github.com/CESNET/libnetconf2.git && \
      cd libnetconf2; mkdir build; cd build && \
      cmake -DENABLE_PYTHON=ON .. && make && make install && \
      cd ../.. && \
      ldconfig

RUN git clone https://github.com/CESNET/liberouter-gui.git

COPY modules/ /opt/dev/liberouter-gui/modules/

RUN \
    cd liberouter-gui && \
    python3 ./bootstrap.py && \
    pip3 install --upgrade pip
RUN cd liberouter-gui && pip3 install -r backend/requirements.base.txt && \
    cd frontend && \
    npm install --unsafe-perm -g @angular/cli && \
    npm install --unsafe-perm

WORKDIR /opt/dev/liberouter-gui/frontend

ENV EDITOR vim
EXPOSE 4200

COPY supervisord.conf /etc/supervisord.conf
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]