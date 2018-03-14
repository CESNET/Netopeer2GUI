FROM ubuntu:16.04

MAINTAINER mislav.novakovic@sartura.hr

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
      # sysrepo
      libavl-dev \
      libev-dev \
      libprotobuf-c-dev \
      protobuf-c-compiler \
      # netopeer2 \
      libssh-dev \
      libssl-dev \
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

# add netconf user
RUN \
      adduser --system netconf && \
      echo "netconf:netconf" | chpasswd

# generate ssh keys for netconf user
RUN \
      mkdir -p /home/netconf/.ssh && \
      ssh-keygen -A && \
      ssh-keygen -t dsa -P '' -f /home/netconf/.ssh/id_dsa && \
      cat /home/netconf/.ssh/id_dsa.pub > /home/netconf/.ssh/authorized_keys

# use /opt/dev as working directory
RUN mkdir /opt/dev
WORKDIR /opt/dev

RUN \
# libyang
      git clone -b devel https://github.com/CESNET/libyang.git cloned && \
      cd cloned && mkdir build && cd build && \
      cmake -DCMAKE_BUILD_TYPE:String="Release" -DENABLE_BUILD_TESTS=OFF .. && \
      make -j2 && \
      make install && \
      ldconfig && \
      cd /opt/dev && \
      rm -rf cloned && \
# sysrepo
      git clone https://github.com/sysrepo/sysrepo.git cloned && \
      cd cloned && mkdir build && cd build && \
      cmake -DCMAKE_BUILD_TYPE:String="Release" -DENABLE_TESTS=OFF -DREPOSITORY_LOC:PATH=/etc/sysrepo .. && \
      make -j2 && \
      make install && \
      ldconfig && \
      cd /opt/dev && \
      rm -rf cloned && \
# libssh
      git clone http://git.libssh.org/projects/libssh.git cloned && \
      cd cloned && mkdir build && cd build && \
      cmake .. && \
      make -j2 && \
      make install && \
      ldconfig && \
      cd /opt/dev && \
      rm -rf cloned && \
# libnetconf2
      git clone https://github.com/CESNET/libnetconf2.git cloned && \
      cd cloned && mkdir build && cd build && \
      cmake -DCMAKE_BUILD_TYPE:String="Release" -DENABLE_BUILD_TESTS=OFF .. && \
      make -j2 && \
      make install && \
      ldconfig && \
      cd /opt/dev && \
      rm -rf cloned && \
# Remove -->>
# keystore
      git clone https://github.com/CESNET/Netopeer2.git cloned && \
      cd cloned && \
      cd keystored && mkdir build && cd build && \
      cmake -DCMAKE_BUILD_TYPE:String="Release" .. && \
      make -j2 && \
      make install && \
      ldconfig && \
# netopeer2
      cd /opt/dev/cloned/server && mkdir build && cd build && \
      cmake -DCMAKE_BUILD_TYPE:String="Release" .. && \
      make -j2 && \
      make install && \
# cli
      cd /opt/dev/cloned/cli && mkdir build && cd build && \
      cmake -DCMAKE_BUILD_TYPE:String="Release" .. && \
      make -j2 && \
      make install && \
      cd /opt/dev && \
      rm -rf cloned


RUN git clone -b devel https://github.com/CESNET/liberouter-gui.git

COPY modules/ /opt/dev/liberouter-gui/modules/

RUN \
    cd liberouter-gui && \
    python3 ./bootstrap.py && \
    pip3 install --upgrade pip && \
    pip3 install -r backend/requirements.txt && \
    pip3 install -r modules/netopeer/backend/requirements.txt && \
    cd frontend && \
    npm install --unsafe-perm -g @angular/cli && \
    npm install --unsafe-perm

WORKDIR /opt/dev/liberouter-gui/frontend

ENV EDITOR vim
EXPOSE 830 4200

COPY ./docker/full/supervisord.conf /etc/supervisord.conf
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
