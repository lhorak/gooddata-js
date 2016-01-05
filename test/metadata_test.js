// Copyright (C) 2007-2014, GoodData(R) Corporation. All rights reserved.
import * as md from '../src/metadata';
import fetchMock from 'fetch-mock';

describe.only('metadata', () => {
    describe('with fake server', () => {
        afterEach(function() {
            fetchMock.restore();
        });

        describe('getAttributes', () => {
            it('should reject with 400 from backend', () => {
                fetchMock.mock(
                    '/gdc/md/myFakeProjectId/query/attributes',
                    400
                );

                return md.getAttributes('myFakeProjectId').then(null, err => expect(err).to.be.an(Error));
            });

            it('should return correct number of entries', () => {
                fetchMock.mock(
                    '/gdc/md/myFakeProjectId/query/attributes',
                    { status: 200, body: JSON.stringify({query: { entries: [{title: 'a1'}, {title: 'a2'}]}}) }
                );

                return md.getAttributes('myFakeProjectId').then(result => {
                    expect(result.length).to.be(2);
                });
            });
        });

        describe('getDimensions', () => {
            it('should reject with 400 from backend', () => {
                fetchMock.mock(
                    '/gdc/md/myFakeProjectId/query/dimensions',
                    400
                );

                return md.getDimensions('myFakeProjectId').then(null, err => expect(err).to.be.an(Error));
            });

            it('should return correct number of entries', () => {
                fetchMock.mock(
                    '/gdc/md/myFakeProjectId/query/dimensions',
                    {
                        status: 200,
                        body: JSON.stringify({query: { entries: [{title: 'a1'}, {title: 'a2'}]}})
                    }
                );

                return md.getDimensions('myFakeProjectId').then(result => {
                    expect(result.length).to.be(2);
                });
            });
        });

        describe('getFacts', () => {
            it('should reject with 400 from backend', () => {
                fetchMock.mock(
                    '/gdc/md/myFakeProjectId/query/facts',
                    400
                );

                return md.getFacts('myFakeProjectId').then(null, err => expect(err).to.be.an(Error));
            });

            it('should return correct number of entries', () => {
                fetchMock.mock(
                    '/gdc/md/myFakeProjectId/query/facts',
                    {
                        status: 200,
                        body: JSON.stringify({query: { entries: [{title: 'a1'}, {title: 'a2'}]}})
                    }
                );

                return md.getFacts('myFakeProjectId').then(result => {
                    expect(result.length).to.be(2);
                });
            });
        });

        describe('getMetrics', () => {
            it('should reject with 400 from backend', () => {
                fetchMock.mock(
                    '/gdc/md/myFakeProjectId/query/metrics',
                    400
                );

                return md.getMetrics('myFakeProjectId').then(null, err => expect(err).to.be.an(Error));
            });

            it('should return correct number of entries', () => {
                fetchMock.mock(
                    '/gdc/md/myFakeProjectId/query/metrics',
                    {
                        status: 200,
                        body: JSON.stringify({query: { entries: [{title: 'a1'}, {title: 'a2'}]}})
                    }
                );

                return md.getMetrics('myFakeProjectId').then(result => {
                    expect(result.length).to.be(2);
                });
            });
        });

        describe('getAvailableMetrics', () => {
            it('should reject with 400 from backend', () => {
                fetchMock.mock(
                    '/gdc/md/myFakeProjectId/availablemetrics',
                    400
                );

                return md.getAvailableMetrics('myFakeProjectId').then(null, err => expect(err).to.be.an(Error));
            });

            it('should return correct number of entries', () => {
                fetchMock.mock(
                    '/gdc/md/myFakeProjectId/availablemetrics',
                    {
                        status: 200,
                        body: JSON.stringify({entries: [{link: 'm1'}, {link: 'm2'}]})
                    }
                );

                return md.getAvailableMetrics('myFakeProjectId').then(result => {
                    expect(result.length).to.be(2);
                });
            });
        });

        describe('getAvailableAttributes', () => {
            it('should reject with 400 from backend', () => {
                fetchMock.mock(
                    '/gdc/md/myFakeProjectId/drillcrosspaths',
                    400
                );

                return md.getAvailableAttributes('myFakeProjectId').then(null, err => expect(err).to.be.an(Error));
            });

            it('should return correct number of entries', () => {
                fetchMock.mock(
                    '/gdc/md/myFakeProjectId/drillcrosspaths',
                    {
                        status: 200,
                        body: JSON.stringify({drillcrosspath: {links: [{link: 'a1'}, {link: 'a2'}]}})
                    }
                );

                return md.getAvailableAttributes('myFakeProjectId').then(result => {
                    expect(result.length).to.be(2);
                });
            });
        });

        describe('getAvailableFacts', () => {
            it('should reject with 400 from backend', () => {
                fetchMock.mock(
                    '/gdc/md/myFakeProjectId/availablefacts',
                    400
                );

                return md.getAvailableFacts('myFakeProjectId').then(null, err => expect(err).to.be.an(Error));
            });

            it('should return correct number of entries', () => {
                fetchMock.mock(
                    '/gdc/md/myFakeProjectId/availablefacts',
                    {
                        status: 200,
                        body: JSON.stringify({entries: [{link: 'm1'}, {link: 'm2'}]})
                    }
                );

                return md.getAvailableFacts('myFakeProjectId').then(result => {
                    expect(result.length).to.be(2);
                });
            });
        });

        describe('getObjectUri', () => {
            it('should return uri when identifier exists', () => {
                fetchMock.mock(
                    '/gdc/md/myFakeProjectId/identifiers',
                    'POST',
                    {
                        status: 200,
                        body: JSON.stringify({
                            identifiers: [{
                                uri: '/foo/bar',
                                identifier: 'attr.foo.bar'
                            }]
                        })
                    }
                );

                fetchMock.mock('/foo/bar', {
                    status: 200,
                    body: JSON.stringify({ attribute: { meta: { uri: '/foo/bar/attr' } } })
                });

                return md.getObjectUri('myFakeProjectId', 'attr.foo.bar').then(result => {
                    expect(result).to.be('/foo/bar/attr');
                });
            });

            it('should reject promise when identifier does not exist', () => {
                fetchMock.mock(
                    '/gdc/md/myFakeProjectId/identifiers',
                    'POST',
                    {
                        status: 200,
                        body: JSON.stringify({ identifiers: []})
                    }
                );

                return md.getObjectUri('myFakeProjectId', 'foo.bar').then(null, err => expect(err).to.be.an(Error));
            });

            it('should return an attribute uri for a display form identifier', () => {
                fetchMock.mock(
                    '/gdc/md/myFakeProjectId/identifiers',
                    'POST',
                    {
                        status: 200,
                        body: JSON.stringify({ identifiers: [{
                                uri: '/foo/bar/label',
                                identifier: 'label.foo.bar'
                        }] })
                    }
                );

                fetchMock.mock('/foo/bar/label', {
                    status: 200,
                    body: JSON.stringify({
                        attributeDisplayForm: {
                            content: {
                                formOf: '/foo/bar'
                            },
                            meta: {
                                identifier: 'label.foo.bar',
                                uri: '/foo/bar/label',
                                title: 'Foo Bar Label'
                            }
                        }
                    })
                });

                fetchMock.mock('/foo/bar', {
                    status: 200,
                    body: JSON.stringify({ attribute: { meta: { uri: '/foo/bar/attr' } } })
                });

                return md.getObjectUri('myFakeProjectId', 'label.foo.bar').then(result => {
                    expect(result).to.be('/foo/bar/attr');
                });
            });
        });
    });
});

