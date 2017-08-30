#! /usr/bin/env python

import random, string
import sys

TEAMS = ['hr', 'realestate', 'shops', 'media', 'core', 'ux', 'seo', 'growth']
POSITION = ['developer', 'teamleader', 'hr', 'pm', 'shops', 'media']

def random_name():
    l = list(string.letters)
    random.shuffle(l)
    return ''.join(l[:random.randint(4, 10)])


num = 1000

if len(sys.argv) == 2:
    try:
        num = int(sys.argv[1])
    except Exception as e:
        print e
        sys.exit(1)

print 'firstName, lastName, email, team, position'
for i in range(num):
    firstName = random_name()
    lastName = random_name()
    email = random_name() + '@gmail.com'
    team = random.choice(TEAMS)
    position = random.choice(POSITION)
    print "%s, %s, %s, %s, %s" % (firstName, lastName, email, team, position)
